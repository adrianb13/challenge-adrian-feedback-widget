# IMPLEMENTATION_SUMMARY.md — Feedback Widget

---

## What Was Built

A full-stack feedback widget application built incrementally across a single development session.

### Backend — FastAPI (Python)

A REST API with five endpoints across two domain modules, combined into a single app by a shared entry point.

**Feedback endpoints** (`api/feedback-api.py`):
- `POST /feedback` — Accept and store a named feedback entry with a 1–5 rating. Returns the stored entry with a generated ID and UTC timestamp.
- `GET /feedback` — Return the 3 most recent feedback entries, newest first.
- `POST /stats` — Return total submission count, average sentiment score, and a computed sentiment label.

**User endpoints** (`api/user-api.py`):
- `POST /users` — Register a new user by username and email. Rejects duplicates with 409.
- `POST /users/verify` — Verify a username + email pair against stored records. Used for sign-in.

**Entry point** (`main.py`):
- Loads both domain modules dynamically via `importlib`
- Owns CORS configuration, global 422 error handler, and a self-contained test runner
- Runs tests with `python main.py --test`; starts the server with `python main.py`

### Frontend — React + Vite

A single-page application with client-side routing across three pages.

**Home page (`/`)**:
- `FeedbackWidget` — Form with name, message, and emoji rating fields. Validates all fields before enabling submission. Shows inline error messages and a success/failure banner. Includes a dark mode toggle in the widget header.
- `RecentFeedback` — Displays the last 3 submitted feedback entries below the widget, newest at top. Updates optimistically on new submission without re-fetching.

**Sign In page (`/signin`)**:
- `SignInPage` — Accepts username and email, posts to `/users/verify`. On success, redirects to the Widget Configurator passing the verified user object via router state.

**Widget Configurator (`/widget-configurator`)**:
- `WidgetConfigurator` — Full configuration panel for the feedback widget and dashboard. All changes persist to `localStorage` and apply immediately on the home page.

---

## Key Technical Details

### Dynamic module loading

`api/feedback-api.py` and `api/user-api.py` use hyphens in their filenames, making them impossible to load with Python's standard `import`. `main.py` uses `importlib.util.spec_from_file_location` to load both files at runtime by path, then registers their `APIRouter` instances with the main `FastAPI` app.

### JSON file persistence

Two separate JSON files store domain data:

| File         | Contents                        |
|--------------|---------------------------------|
| `data.json`  | Feedback entries + running stats |
| `users.json` | Registered user accounts        |

Data is loaded into module-level Python lists on startup and mutated in-memory during the session. Every write operation saves the full state back to disk. On `POST /feedback`, if the disk write fails, the in-memory append is rolled back to keep both stores consistent.

### CSS variable scoping for configuration

Widget and dashboard colours are applied without prop threading. `App.jsx` wraps each component in a `div` with inline `style` overrides that set CSS custom properties:

```jsx
<div style={{ "--bg-card": config.widgetBg, "--accent": config.widgetBtnColor, ... }}>
  <FeedbackWidget ... />
</div>
```

The child components already consume `var(--bg-card)`, `var(--accent)`, etc. from the theme. The inline override scopes the new values to that subtree only, so the rest of the page is unaffected.

### Optimistic UI updates

When feedback is submitted, the `POST /feedback` response includes the full new entry. `App.jsx` passes this directly as a `latestEntry` prop to `RecentFeedback`, which prepends it to the displayed list and trims to 3 — no re-fetch required. This keeps the UI responsive regardless of network latency.

### Two-layer validation

Client-side validation (React state) prevents unnecessary network requests and provides immediate user feedback using a blur-first triggering strategy — errors appear after a field loses focus, not while the user is actively typing. Server-side validation (Pydantic `@field_validator`) enforces the same rules independently. A custom global exception handler normalises Pydantic's nested error output into a flat `{ field, message }` structure.

### Dark mode

Toggling dark mode adds or removes the `dark` class on `document.body`. All colour switching is handled entirely in CSS via `body.dark` variable overrides — no JavaScript colour logic. The preference is persisted to `localStorage` and restored on page load.

### Widget configuration persistence

The Widget Configurator writes all configuration to `localStorage` under `"widgetConfig"` on every user interaction. The home page re-reads this on focus (when the user navigates back), picking up any changes made in the configurator. Stored config is spread-merged with defaults on load, so missing keys always fall back gracefully:

```js
{ ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem("widgetConfig")) }
```

### Vite dev proxy

The Vite dev server proxies three path prefixes to the FastAPI backend on port 8000:

```
/feedback  →  http://localhost:8000
/stats     →  http://localhost:8000
/users     →  http://localhost:8000
```

This means the React app uses only relative paths in `fetch()` calls, with no hardcoded ports or CORS preflight requests during development.

### Test isolation

The test runner in `main.py` deletes both JSON files and clears all in-memory state before running. To prevent this from wiping real data on every server restart, test execution is gated behind a `--test` CLI flag.

---

## Project Structure

```
challenge-adrian-feedback-widget/
├── api/
│   ├── feedback-api.py         # Feedback + stats APIRouter
│   └── user-api.py             # User create + verify APIRouter
├── main.py                     # App entry point, combined routers, test runner
├── data.json                   # Auto-created; feedback entries + stats
├── users.json                  # Auto-created; registered users
├── DESIGN.md                   # Architecture + UX design document
├── IMPLEMENTATION_SUMMARY.md   # This file
├── prompts_history.txt         # Full session prompt history
└── client/
    ├── package.json
    ├── vite.config.js           # Dev proxy config
    └── src/
        ├── main.jsx             # React root, BrowserRouter
        ├── App.jsx              # Routes, dark mode, config state
        ├── App.css
        ├── index.css            # CSS variables, light + dark themes
        ├── FeedbackWidget.jsx   # Feedback form component
        ├── FeedbackWidget.css
        ├── RecentFeedback.jsx   # Last 3 feedback entries display
        ├── RecentFeedback.css
        ├── SignInPage.jsx       # Sign-in form, /users/verify
        ├── SignInPage.css
        ├── WidgetConfigurator.jsx  # Position + colour config panel
        └── WidgetConfigurator.css
```

---

## Running the Application

**Start the backend:**
```bash
python main.py
```

**Run the test suite** (clears all data):
```bash
python main.py --test
```

**Start the frontend dev server:**
```bash
cd client
npm run dev
```

The app is then available at `http://localhost:5173`. API runs on `http://localhost:8000`.

---

## Known Limitations

### No authentication tokens or sessions
Sign-in is implemented as a username + email lookup only. There are no passwords, hashed credentials, session cookies, or JWTs. Any user who knows another user's username and email address can sign in as them. This was acceptable for the challenge scope but would need a full auth layer in production.

### JSON file persistence is not concurrent-safe
Both `data.json` and `users.json` are written with full-file overwrites. Simultaneous requests from multiple users could produce a race condition where one write overwrites another. A database (SQLite at minimum) would be required for any multi-user production use.

### No pagination on feedback
`GET /feedback` always returns exactly 3 entries. There is no offset, cursor, or page parameter. All historical feedback beyond the most recent 3 is inaccessible via the API (though it remains stored in `data.json`).

### In-memory state resets on server restart
Module-level Python lists are re-populated from JSON on every server start. This means the running stats (`total_submissions`, `rating_sum`) reflect what is in `data.json` at startup, which is correct — but any crash between an in-memory update and the disk write will lose that operation.

### Node 16 compatibility requires Vite 4
Vite 5 dropped support for Node 16. This project uses `vite@^4.5.3` and `@vitejs/plugin-react@^3.1.0` to remain compatible with the installed Node version. Upgrading Node to 18+ would allow migration to Vite 5.

### User IDs are position-based
User and feedback IDs are assigned as `len(list) + 1` at insert time. If entries were ever deleted, subsequent inserts would produce duplicate IDs. There is currently no delete endpoint, so this does not cause issues in practice.

### Widget configurator is not access-controlled
The `/widget-configurator` route is publicly accessible by URL even without signing in. The `user` display name in the configurator header simply renders nothing if no router state is present — it does not redirect unauthenticated visitors.

### Dark mode and widget config are device-local
Both preferences are stored in `localStorage` and are therefore specific to the browser and device. Signing in on a different device starts with default settings.

### Stats endpoint uses POST
`POST /stats` performs a read operation with a minor write side effect (re-saving current state to disk). A more conventional REST design would use `GET /stats`, but the current behaviour was specified as a requirement and does not cause functional issues.
