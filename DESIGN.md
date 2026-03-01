# DESIGN.md — Feedback Widget

Technical design document covering architecture decisions, data models, and UX rationale.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Decisions](#architecture-decisions)
3. [Data Model](#data-model)
4. [API Design](#api-design)
5. [Frontend Architecture](#frontend-architecture)
6. [Theming System](#theming-system)
7. [Widget Configuration System](#widget-configuration-system)
8. [UX Rationale](#ux-rationale)
9. [Validation Strategy](#validation-strategy)
10. [Known Constraints](#known-constraints)

---

## Project Overview

A full-stack feedback collection application consisting of:

- A **FastAPI** backend serving feedback, stats, and user endpoints
- A **React** frontend with a feedback submission widget, a recent feedback dashboard, a sign-in page, and a widget configurator

```
challenge-adrian-feedback-widget/
├── api/
│   ├── feedback-api.py       # Feedback + stats endpoints
│   └── user-api.py           # User create + verify endpoints
├── main.py                   # App entry point, combined router, tests
├── data.json                 # Persisted feedback + stats (auto-created)
├── users.json                # Persisted users (auto-created)
└── client/
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── FeedbackWidget.jsx
        ├── RecentFeedback.jsx
        ├── SignInPage.jsx
        └── WidgetConfigurator.jsx
```

---

## Architecture Decisions

### 1. Split API files with importlib loading

**Decision:** Split endpoints across `feedback-api.py` and `user-api.py`, loaded dynamically by `main.py` using `importlib.util`.

**Rationale:** Python's standard `import` statement cannot load files with hyphens in their names. `importlib.util.spec_from_file_location` was used as a workaround, allowing the hyphenated naming convention to be preserved while still combining both routers into a single FastAPI app in `main.py`.

**Trade-off:** Slightly unconventional loading pattern. The benefit is clean separation of concerns between feedback and user domains without renaming files.

### 2. Single combined FastAPI app in main.py

**Decision:** `main.py` owns the FastAPI app instance, CORS middleware, global exception handler, and test runner. The domain files (`feedback-api.py`, `user-api.py`) only define `APIRouter` instances.

**Rationale:** Centralising cross-cutting concerns (CORS, error formatting) in one place prevents duplication. Each domain file focuses purely on its routes and business logic.

### 3. JSON file persistence (no database)

**Decision:** Feedback and stats persist to `data.json`; users persist to `users.json`.

**Rationale:** Keeps the stack simple with no external dependencies. Two separate files maintain domain isolation — feedback data and user data do not share a single file, reducing the risk of one domain's corruption affecting the other.

**Trade-off:** Not suitable for concurrent writes or large data volumes. Acceptable for a challenge/prototype context.

### 4. In-memory state with file-backed persistence

**Decision:** On startup, data is loaded from JSON into module-level Python lists/dicts. All runtime operations mutate these in-memory structures, then save to disk.

**Rationale:** Avoids reading from disk on every request, keeping response times fast. On save failure, POST /feedback rolls back the in-memory append to keep in-memory and on-disk state consistent.

### 5. Test runner gated behind --test flag

**Decision:** `python main.py --test` runs tests; `python main.py` starts the server. Tests delete both JSON files and reset in-memory state before running.

**Rationale:** Early in development, tests ran on every `python main.py` invocation, which wiped `users.json` each time the server restarted — deleting real user accounts. Gating tests behind a CLI flag separates test execution from server operation.

### 6. Vite dev server proxy

**Decision:** Vite proxies `/feedback`, `/stats`, and `/users` to `http://localhost:8000`.

**Rationale:** Avoids CORS preflight issues during development by making all API calls appear same-origin from the browser's perspective. The React app uses relative paths (e.g. `fetch("/feedback")`) with no hardcoded ports.

**Note:** All three prefixes must be listed explicitly. A missing `/users` entry was the root cause of a sign-in bug — Vite returned its own 404 HTML page, which the React error handler misread as an API "user not found" response.

---

## Data Model

### Feedback entry (`data.json → feedbacks[]`)

```json
{
  "id": 1,
  "name": "Alice",
  "message": "Absolutely loved it!",
  "rating": 5,
  "submitted_at": "2026-03-01T10:00:00.000000"
}
```

| Field          | Type    | Constraints                        |
|----------------|---------|------------------------------------|
| `id`           | int     | Auto-incremented, 1-based          |
| `name`         | string  | Non-empty, max 100 characters      |
| `message`      | string  | Non-empty, max 1000 characters     |
| `rating`       | int     | 1–5 inclusive                      |
| `submitted_at` | string  | ISO 8601 UTC datetime              |

### Stats (`data.json → stats`)

```json
{
  "total_submissions": 4,
  "rating_sum": 14
}
```

`average_sentiment` is computed on demand from `rating_sum / total_submissions`, not stored. This prevents the stored value drifting out of sync.

### User entry (`users.json`)

```json
{
  "id": 1,
  "username": "alice",
  "email": "alice@example.com",
  "created_at": "2026-03-01T10:00:00.000000"
}
```

| Field        | Type   | Constraints                                 |
|--------------|--------|---------------------------------------------|
| `id`         | int    | Auto-incremented, 1-based                   |
| `username`   | string | 3–50 characters, case-insensitive uniqueness |
| `email`      | string | Regex-validated, lowercased, unique         |
| `created_at` | string | ISO 8601 UTC datetime                       |

---

## API Design

### Endpoints

| Method | Path            | Description                              | Response      |
|--------|-----------------|------------------------------------------|---------------|
| POST   | `/feedback`     | Submit new feedback entry                | 201 + entry   |
| GET    | `/feedback`     | Return 3 most recent entries, newest first | 200 + list  |
| POST   | `/stats`        | Return submission count and avg sentiment | 200 + stats  |
| POST   | `/users`        | Create a new user account                | 201 + user    |
| POST   | `/users/verify` | Verify username + email match a record   | 200 + user    |

### Sentiment label thresholds

| Average rating | Label         |
|----------------|---------------|
| 5.0            | perfect       |
| ≥ 4.5          | very positive |
| ≥ 3.5          | positive      |
| ≥ 2.5          | neutral       |
| ≥ 1.5          | negative      |
| < 1.5          | very negative |

### Error response shape (422 Validation)

All validation errors are normalised by a global exception handler:

```json
{
  "detail": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email address" }
  ]
}
```

**Rationale:** FastAPI's default 422 response includes deeply nested Pydantic error paths. The custom handler flattens these to a consistent `{ field, message }` structure that the frontend can consume without traversing nested arrays.

### Why POST for /stats?

`POST /stats` is semantically unusual for a read operation, but was specified as a requirement. The endpoint reads the in-memory stats and also persists the current state to `data.json`, so it has a minor side effect beyond pure retrieval.

---

## Frontend Architecture

### Component tree

```
App (routes, dark mode state, widgetConfig state)
├── / (home)
│   ├── nav > Link /signin
│   ├── FeedbackWidget (form, emoji rating, dark toggle)
│   └── RecentFeedback (last 3 entries, optimistic updates)
├── /signin
│   └── SignInPage (username + email form, /users/verify)
└── /widget-configurator
    └── WidgetConfigurator (position + color config, preview, reset)
```

### State ownership

| State            | Owner              | Persistence      |
|------------------|--------------------|------------------|
| `dark`           | App                | localStorage     |
| `widgetConfig`   | App (read), WidgetConfigurator (write) | localStorage |
| `latestEntry`    | App                | None (session)   |
| Form fields      | FeedbackWidget     | None             |
| User session     | Router state (via `useLocation`) | None  |

### Optimistic update pattern (RecentFeedback)

When a user submits feedback, the API returns the full new entry in the POST response. Rather than triggering a re-fetch of `GET /feedback`, the new entry is passed as a `latestEntry` prop into `RecentFeedback`, which prepends it to the displayed list and trims to 3.

**Rationale:** Eliminates a round-trip fetch on every submission. The user sees their feedback appear immediately, while the server's eventual consistent state is used on next mount.

### Config refresh strategy

`App.jsx` reads `widgetConfig` from `localStorage` on initial mount. When the user navigates from the Widget Configurator back to the home page, the home page `div` has an `onFocus` handler that calls `refreshConfig()`, re-reading from `localStorage` to pick up any changes made in the configurator.

---

## Theming System

All colours are defined as CSS custom properties on `:root` (light mode) and overridden on `body.dark` (dark mode). No JavaScript is involved in colour switching — toggling the `dark` class on `body` is sufficient.

### Core variables

| Variable            | Purpose                          |
|---------------------|----------------------------------|
| `--bg-page`         | Page background                  |
| `--bg-card`         | Card / widget background         |
| `--text-primary`    | Headings, strong text            |
| `--text-secondary`  | Body text                        |
| `--text-muted`      | Labels, secondary info           |
| `--accent`          | Primary action colour (indigo)   |
| `--accent-hover`    | Hover state for accent           |
| `--accent-disabled` | Disabled state for buttons       |
| `--error`           | Validation error colour (red)    |
| `--shadow`          | Card drop shadow                 |
| `--toggle-bg`       | Dark/light mode toggle button bg |

Dark mode preference is persisted to `localStorage` under the key `"theme"` and restored on page load.

---

## Widget Configuration System

### Configurable properties

| Key                | Default     | Effect                                        |
|--------------------|-------------|-----------------------------------------------|
| `widgetAlign`      | `center`    | Horizontal alignment of feedback widget       |
| `dashboardPosition`| `below`     | Dashboard renders above or below widget       |
| `widgetBg`         | `#ffffff`   | Widget card background colour                 |
| `widgetText`       | `#1a1a2e`   | Widget text colour                            |
| `widgetBtnColor`   | `#6366f1`   | Submit button colour                          |
| `dashboardBg`      | `#ffffff`   | Dashboard card background colour              |
| `dashboardText`    | `#1a1a2e`   | Dashboard text colour                         |

### How config is applied

Config is not passed as props down through the component tree. Instead, `App.jsx` reads config from `localStorage` and applies values as **inline CSS custom property overrides** on wrapper divs:

```jsx
// Widget wrapper
<div style={{
  "--bg-card":        config.widgetBg,
  "--text-primary":   config.widgetText,
  "--accent":         config.widgetBtnColor,
  ...
}}>
```

**Rationale:** The widget and dashboard components use `var(--bg-card)`, `var(--accent)`, etc. internally. Overriding these variables at the wrapper level scopes the override to that subtree only, without touching the rest of the page or requiring any prop threading.

### Persistence

Config is written to `localStorage` under `"widgetConfig"` on every change (each button click or color picker adjustment). Defaults are spread-merged with stored values on load, so new config keys added in future will fall back gracefully:

```js
{ ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem("widgetConfig")) }
```

---

## UX Rationale

### Emoji rating scale instead of stars

Five emoji (😡 😞 😐 😊 🤩) replace a traditional star rating. They communicate emotional valence more directly than numbered stars and require no text legend to interpret. Each emoji has an accessible `aria-label` for screen readers.

### Selected rating: border highlight, not fill

The selected emoji button uses a coloured border and subtle background tint rather than a filled/inverted state. This keeps the emoji itself legible at all sizes and avoids obscuring the emoji with an opaque background.

### Inline validation with blur-first triggering

Errors appear after a field loses focus (`onBlur`), not while the user is typing. This avoids showing "Name is required" the instant the user clicks into the name field. Once a field has been touched, errors update in real time on `onChange` to give responsive feedback during correction.

The submit button is disabled until all fields pass validation, giving users a clear signal before they attempt submission.

### Optimistic success state

After a successful submission the form resets immediately and a success banner is shown. The recent feedback list updates instantly without waiting for a re-fetch. This makes the application feel responsive even if the network is slow.

### Dark mode toggle location

The dark mode toggle is placed inside the feedback widget header rather than at a fixed page position. This keeps it visually tied to the widget and avoids covering content with an absolutely-positioned overlay button.

### Sign-in via username + email (no password)

User verification matches a stored `username + email` pair. This is appropriate for a lightweight challenge context where full authentication infrastructure (hashed passwords, sessions, tokens) is out of scope.

### Widget Configurator: live preview

Changes to position and colour settings are reflected immediately in a miniature preview panel within the configurator. Users can see the effect of their choices before navigating back to the main page, reducing trial-and-error round trips.

### Equal-size footer buttons (text wrapping)

The configurator footer uses `flex: 1` on both the back link and reset button so they share available width equally regardless of label length. `white-space: normal` and `word-break: break-word` allow longer labels to wrap to a second line rather than truncating or overflowing.

---

## Validation Strategy

Validation is applied at two layers:

### Client-side (FeedbackWidget, SignInPage)

- Prevents network requests for obviously invalid input
- Mirrors the server rules to give consistent error messages
- Uses the touched/blur pattern to avoid premature error display

### Server-side (Pydantic validators in feedback-api.py and user-api.py)

- Enforces correctness regardless of client behaviour
- Returns structured 422 errors via the custom exception handler
- Strips and normalises input (`.strip()`, `.lower()`) before storing

**Rule summary:**

| Field      | Client rule              | Server rule                        |
|------------|--------------------------|------------------------------------|
| `name`     | Non-empty                | Non-empty, max 100 chars           |
| `message`  | Non-empty                | Non-empty, max 1000 chars          |
| `rating`   | 1–5                      | Integer 1–5                        |
| `username` | Min 3 chars              | 3–50 chars                         |
| `email`    | Regex `x@x.x`            | Regex `^[^@\s]+@[^@\s]+\.[^@\s]+$`, lowercased |

---

## Known Constraints

| Constraint | Detail |
|------------|--------|
| No authentication tokens | Sign-in is username + email matching only; no sessions or JWTs |
| Single-process JSON persistence | Not safe for concurrent write access |
| No pagination | GET /feedback always returns exactly 3 entries |
| Node 16 compatibility | Vite 4 used instead of Vite 5 due to Node 16 engine requirement |
| importlib loading | Required because Python cannot `import` files with hyphens in their names |
| In-memory state reset on restart | All in-memory lists reload from JSON on server start; state is consistent but stateless between processes |
