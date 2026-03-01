# FUTURE_PLANS.md — Feedback Widget

Planned features, improvements, and technical debt to address in future development.

---

## Table of Contents

1. [What to Build Next](#what-to-build-next)
2. [Improvements](#improvements)
3. [Technical Debt to Address](#technical-debt-to-address)

---

## What to Build Next

### Export Feedback Data To CSV

Depending on how we want to allow the user to request the CSV, it could be implemented in a few ways. One could be a separate module as part of the "Widget Configurator" that makes that request.  An additional API endpoint would need to be created for this functionality. Another is a "back-end" way create a method in "main.py" that would do exactly that task. This is not user-friendly and would require access to the server.

### AI-Powered Sentiment Analysis

Use AI to analyze the comments provided and see what can be inferred from customers.  Example is to examine what can be improved, what is and isn't working, and other specific details a customer might provide for both good and bad feedback.

### Attach Customize Widget Settings To User

The Widget Customization is currently tied to the user who made the changes. I would like to connect those to the user and maybe even keep a list of saved options they have previously created so they can automatically toggle between prior settings.

### Authentication & User Accounts

The current sign-in flow is username + email matching only — no passwords, sessions, or tokens. A proper auth layer is the most important next feature before any real-world use.

- Add hashed passwords (`bcrypt`) to the user model
- Issue JWT tokens or server-side sessions on successful login
- Protect routes that require a signed-in user (`/widget-configurator`)
- Add logout functionality
- Add a registration page (currently users must be created directly via `POST /users`)
- Add password reset flow

### Feedback Management Dashboard

The current `RecentFeedback` component shows only the 3 most recent entries globally. A proper management view would allow users to work with their full feedback history.

- Full paginated list of all feedback entries
- Filter by rating range (e.g. show only 1–2 star entries)
- Filter by date range
- Sort by newest, oldest, or rating
- Mark individual entries as read/reviewed
- Delete individual feedback entries
- Export feedback to CSV or JSON

### Analytics & Reporting

The current `POST /stats` returns a single average and label. More detailed analytics would provide actionable insight.

- Sentiment trend over time (line chart)
- Rating distribution (bar chart showing count per rating level)
- Submission volume by day/week/month
- Breakdown of sentiment label counts
- Best and worst rated periods

### Multi-Project / Multi-Widget Support

Currently the application has a single feedback widget with one configuration. Supporting multiple independent widgets would allow the same platform to serve several products or teams.

- Users can create named projects, each with its own widget configuration
- Each project has its own feedback stream, stats, and configurator
- Shareable embed snippet per project for third-party sites

### Embeddable Widget

The feedback widget currently only works within this React app. Making it embeddable would let external sites use it.

- Build the widget as a standalone script (IIFE or Web Component)
- One-line embed code snippet: `<script src="..." data-project-id="..."></script>`
- Widget configuration loaded from server per project ID
- Submissions routed to the correct project

### Email Notifications

- Notify the account owner when new feedback is received
- Configurable thresholds (e.g. only notify on 1–2 star ratings)
- Digest emails (daily or weekly summary)

---

## Improvements

### Mobile & Responsive Layout

The current layout is centred and works on moderate viewport widths but has not been tested or optimised for small screens.

- Ensure the feedback widget and recent feedback cards stack cleanly on narrow screens
- Touch-friendly emoji rating buttons (larger tap targets)
- Responsive typography scaling
- Widget Configurator layout adapts to single-column on small screens

### Accessibility

- Audit all interactive elements for keyboard navigability
- Improve focus ring visibility in both light and dark modes
- Ensure colour contrast ratios meet WCAG AA across all theme combinations, including user-selected configurator colours
- Add `role` and `aria-live` attributes to the success/error banners so screen readers announce submission results
- Associate all form labels correctly (some currently rely on proximity rather than `htmlFor`)

### Loading States & Skeletons

- Show skeleton placeholder cards in `RecentFeedback` while the initial fetch is in progress
- Show a spinner or disabled state in the sign-in form while the verify request is in flight
- Prevent double submission by disabling the feedback form during the POST request (currently done via `loading` state but the UI feedback could be clearer)

### Character Counters

- Show a live character counter on the `message` textarea (e.g. `142 / 1000`)
- Show a counter on the `name` field approaching the 100-character limit
- Style the counter red as the limit approaches

### Configurator Colour Picker UX

- The native `<input type="color">` appearance varies significantly between browsers and operating systems
- Replace with a custom colour picker component that provides consistent appearance
- Allow typing a hex value directly with live preview update
- Offer a curated palette of preset theme combinations (e.g. "Ocean", "Monochrome", "Forest")

### Transition & Animation Polish

- Animate the recent feedback list when a new entry is prepended (slide in from top)
- Smooth page transitions between routes
- Animate the Widget Configurator live preview when position or colour values change
- Add a subtle entrance animation to the feedback widget on page load

### Rate Limiting

- Limit the number of feedback submissions per IP address within a time window to prevent spam
- Return a `429 Too Many Requests` response when the limit is exceeded
- Show a user-friendly cooldown message in the widget

### API Versioning

- Prefix all endpoints with `/api/v1/` to allow future breaking changes without disrupting existing clients

---

## Technical Debt to Address

### Rename API files to remove hyphens

`feedback-api.py` and `user-api.py` use hyphens because of naming conventions chosen early in development. This forces the use of `importlib.util.spec_from_file_location` for loading, which is non-standard and surprising to new contributors.  In the prompts, intended to use "_" and not "-" but was distracted by actual functionality of what was being created.

**Fix:** Rename to `feedback_api.py` and `user_api.py`. Standard `import` can then be used, and `main.py` becomes significantly simpler.

### Replace position-based IDs with UUIDs

Both feedback entries and users are assigned IDs as `len(list) + 1`. If entries are ever deleted, subsequent inserts will produce duplicate IDs.

**Fix:** Use `uuid.uuid4()` to generate IDs at insert time. This is safe regardless of deletions.

### Deduplicate DEFAULT_CONFIG

`DEFAULT_CONFIG` is defined identically in both `App.jsx` and `WidgetConfigurator.jsx`. If a new config key is added to one but not the other, the reset behaviour will silently diverge.

**Fix:** Extract `DEFAULT_CONFIG` and the `loadConfig()` function to a shared module (e.g. `src/config.js`) and import it in both components.

### Replace custom test runner with pytest

The test runner in `main.py` is a hand-rolled suite using `TestClient` and a custom `check()` function. It works but lacks proper isolation between tests, test naming conventions, assertion messages, and reporting.

**Fix:** Migrate to `pytest` with `httpx` or `fastapi.testclient`. Each test becomes its own function, fixtures handle setup/teardown, and test output is standard.

### Replace hardcoded CORS origin with environment config

`main.py` hardcodes `allow_origins=["http://localhost:5173"]`. This breaks as soon as the frontend is deployed to a different domain or port.

**Fix:** Read allowed origins from an environment variable (e.g. `ALLOWED_ORIGINS=http://localhost:5173,https://myapp.com`) with a sensible local default.

### Upgrade to Vite 5 (requires Node 18+)

Vite 4 was used to maintain Node 16 compatibility. Vite 4 is no longer actively maintained and misses performance improvements and plugin ecosystem updates available in Vite 5.

**Fix:** Upgrade Node to 18 LTS or later, then upgrade `vite` to `^5.x` and `@vitejs/plugin-react` to `^4.x`.

### Change POST /stats to GET /stats

`POST /stats` is semantically incorrect for an endpoint that primarily reads data. It was implemented as POST to match an early requirement but violates REST conventions and would confuse any future API consumer or documentation tool.

**Fix:** Add a `GET /stats` endpoint. Deprecate and eventually remove `POST /stats`. The minor disk write side effect can be removed or moved to a scheduled background task.

### Add TypeScript to the frontend

The React codebase has no type annotations. As the component tree grows, prop mismatches and undefined property accesses become harder to catch without type checking.

**Fix:** Migrate to TypeScript gradually using `allowJs: true` in `tsconfig.json` so existing `.jsx` files continue to work while new files are written in `.tsx`.

### Protect the Widget Configurator route

`/widget-configurator` is publicly accessible by URL without signing in. There is no redirect for unauthenticated visitors — the `user` heading in the configurator simply renders nothing.

**Fix:** Once proper auth tokens are in place, add a route guard that redirects to `/signin` if no valid session is found.

### Input sanitisation for stored text

Submitted `name` and `message` values are stored and re-rendered as React text nodes, which safely escapes HTML. However, if the stored values were ever rendered via `dangerouslySetInnerHTML` or sent in an email, they would need sanitisation.

**Fix:** Strip or escape HTML-significant characters server-side before storing. Consider using a library such as `bleach` for Python-side sanitisation as a defensive measure.

### Replace full-file JSON overwrites with a real database

Both `data.json` and `users.json` are written as complete file replacements on every mutation. This is not safe under concurrent access and will not scale.

**Fix:** Migrate to SQLite (via `SQLAlchemy` or `databases` + `aiosqlite`) as a minimal step up. For production, use PostgreSQL. This also enables proper pagination, filtering, and indexing.

### Paginate GET /feedback

`GET /feedback` always returns exactly 3 entries with no way to request more or navigate history.

**Fix:** Add `limit` and `offset` (or cursor-based) query parameters. Default `limit=3` to maintain current behaviour. Example: `GET /feedback?limit=10&offset=0`.
