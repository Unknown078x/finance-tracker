# Ledger — Personal Finance Tracker

A full-stack app for tracking income, expenses, and savings goals. Node/Express + SQLite on the backend, React (Vite) + Recharts on the frontend, JWT auth, and a ledger-styled UI.

```
finance-tracker/
├── backend/     Express API, SQLite (better-sqlite3), JWT auth, Jest tests
├── frontend/    React + Vite SPA, Recharts, Vitest tests
├── docker-compose.yml   Run both services together locally or on any Docker host
├── render.yaml           Render.com blueprint for the backend
└── frontend/vercel.json  Vercel config for the frontend
```

## Features

- Email/password auth with JWT, bcrypt-hashed passwords
- Full CRUD for transactions and categories, scoped per user
- Server-side validation on every write endpoint with field-level error messages
- Dashboard with income/expense totals, a monthly trend chart, and recent activity
- Reports page with per-category breakdowns over a chosen date range
- Savings goals with progress bars
- Centralized error handling, structured JSON request logging, rate limiting on auth routes, `helmet` security headers
- 11 backend tests (Jest + Supertest), 7 frontend tests (Vitest + Testing Library)

## Run it locally

Requirements: Node 18+.

**Backend**
```bash
cd backend
cp .env.example .env      # edit JWT_SECRET before deploying anywhere real
npm install
npm run dev                # http://localhost:4000
npm test                   # runs the Jest suite
```

**Frontend** (separate terminal)
```bash
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173, proxies /api to :4000
npm test                    # runs the Vitest suite
```

Register an account in the browser — a starter set of income/expense categories is created for you automatically.

## Run it with Docker

This is the closest thing to a one-command deployment, and works on any machine or VPS with Docker installed:

```bash
JWT_SECRET=$(openssl rand -hex 32) docker compose up --build
```

- Frontend: http://localhost:8080
- Backend: http://localhost:4000 (proxied through the frontend's nginx at `/api`)
- The SQLite file persists in a named Docker volume (`finance-data`) across restarts.

## Deploying live

GitHub Pages only serves static files, so it can host the **frontend** but not the Node/SQLite **backend**. The split that works:

### 1. Backend → Render

1. Push this repo to GitHub (see below).
2. In Render: **New → Blueprint** → select the repo. `render.yaml` provisions the web service, a persistent disk for the SQLite file, and generates `JWT_SECRET` for you.
3. Once it's live, copy the service URL, e.g. `https://finance-tracker-api.onrender.com`. Leave `CORS_ORIGIN` for a moment — you'll set it after step 2.

### 2. Push to GitHub

```bash
cd finance-tracker
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

### 3. Frontend → GitHub Pages

A workflow at `.github/workflows/deploy-frontend.yml` builds and publishes the frontend automatically on every push to `main`. Before it can run:

1. In the repo: **Settings → Pages → Source** → set to **GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables tab** → New repository variable:
   - Name: `VITE_API_URL`
   - Value: your Render URL + `/api`, e.g. `https://finance-tracker-api.onrender.com/api`
3. Push anything to `main` (or re-run the workflow from the **Actions** tab) to trigger a deploy. It'll appear at `https://<your-username>.github.io/<repo-name>/`.
4. Back in Render, set `CORS_ORIGIN` to that Pages URL and redeploy the backend so the two can talk to each other.

Notes specific to Pages:
- The app uses `HashRouter` (URLs look like `.../#/transactions`) instead of `BrowserRouter`, because Pages has no server to rewrite unknown paths back to `index.html` the way Vercel or nginx can.
- The workflow sets the Vite `base` path to `/<repo-name>/` automatically from the repository name — no manual config needed.

---

Alternative: two free options that need nothing beyond a GitHub account, if you'd rather not split across Render + Pages:

**Backend → Render**
1. Push this repo to GitHub.
2. In Render: New → Blueprint → select the repo. `render.yaml` sets up the web service, a persistent disk for the SQLite file, and generates `JWT_SECRET` for you.
3. Once deployed, set `CORS_ORIGIN` in the Render dashboard to your frontend's URL (from the step below).
4. Note the service URL, e.g. `https://finance-tracker-api.onrender.com`.

**Frontend → Vercel**
1. In Vercel: New Project → import the same repo → set the root directory to `frontend`.
2. Add an environment variable `VITE_API_URL` = `https://finance-tracker-api.onrender.com/api` (your Render URL + `/api`).
3. Deploy. Vercel picks up `frontend/vercel.json` automatically for SPA routing.
4. Go back to Render and set `CORS_ORIGIN` to the Vercel URL it gives you, then redeploy the backend so the two can talk to each other.

Any other Node host (Fly.io, Railway, a plain VPS) works the same way using the `backend/Dockerfile` directly — the app only needs a writable disk for the SQLite file and the four environment variables in `.env.example`.

## API reference

Base URL: `/api`. All routes except `/auth/register` and `/auth/login` require `Authorization: Bearer <token>`.

| Method | Route | Description |
|---|---|---|
| POST | `/auth/register` | Create an account. Body: `name, email, password` (password ≥ 8 chars). Returns `{ user, token }`. |
| POST | `/auth/login` | Log in. Body: `email, password`. Returns `{ user, token }`. |
| GET | `/auth/me` | Current user. |
| GET | `/categories` | List the caller's categories. |
| POST | `/categories` | Create one. Body: `name, type (income\|expense), color?`. |
| PUT | `/categories/:id` | Update one. |
| DELETE | `/categories/:id` | Delete one (fails with 409 if transactions reference it). |
| GET | `/transactions` | List, paginated. Query: `type?, category_id?, from?, to?, page?, limit?`. |
| POST | `/transactions` | Create one. Body: `category_id, type, amount, occurred_on (YYYY-MM-DD), note?`. |
| PUT | `/transactions/:id` | Update one. |
| DELETE | `/transactions/:id` | Delete one. |
| GET | `/reports/summary` | Query: `from?, to?` (defaults to the last 6 months). Returns totals, monthly series, category breakdown, and 5 most recent transactions. |
| GET | `/goals` | List savings goals. |
| POST | `/goals` | Create one. Body: `name, target_amount, target_date?`. |
| PUT | `/goals/:id` | Update one (e.g. bump `saved_amount`). |
| DELETE | `/goals/:id` | Delete one. |

Every validation failure returns `422` with `{ error, fields: { field: message } }`. Auth failures return `401`. Ownership violations (someone else's category/transaction) return `404`, not `403`, so as not to leak existence.

## Notes on the "definition of done" checklist

- **Auth**: JWT + bcrypt, 7-day token expiry, rate-limited login/register.
- **CRUD**: verified by the Jest suite (registration, login, transaction create/read/update/delete, cross-user isolation).
- **Responsive UI**: sidebar collapses to a top bar under 860px; layouts single-column on mobile.
- **Testing**: `cd backend && npm test` (11 tests), `cd frontend && npm test` (7 tests) — both pass as of this build.
- **Deployment**: `docker-compose.yml` for self-hosting, `render.yaml` + `vercel.json` for a free managed deploy. This build environment doesn't have outbound access to Render/Vercel/Heroku, so the live URL step needs to be run from your own machine or CI — everything needed to do that in a few clicks is in this repo.
