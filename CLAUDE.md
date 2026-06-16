# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal finance web app ("Mis Finanzas"): React SPA frontend + Express REST API backend + MySQL. Monorepo with two independent npm projects: `backend/` and `frontend/`.

## Commands

### Backend (`backend/`)
- `npm install`
- `npm start` — runs `node --watch src/server.js`, listens on port 8080 (hardcoded). No test suite configured (`npm test` is a stub).

### Frontend (`frontend/`)
- `npm install`
- `npm run dev` — Vite dev server
- `npm run build` — production build (Vite reads `VITE_API_BASE_URL` at build time, baked into bundle — not a runtime env var)
- `npm run lint` — ESLint
- `npm run preview` — preview production build

### Database
- Schema in `backend/database/schema.sql`, seed/test data in `inserts.sql` / `test_data.sql`. No migration tool — apply SQL files directly against MySQL.

## Architecture

### Backend (Express, CommonJS)
Layering is strict and consistent across every resource: **routes → services → connections/database**. Always follow this pattern when adding a resource.

- `src/server.js` — single entrypoint. Mounts routers, applies `cookieJwtAuth` middleware per route group (NOT globally — `/auth` and `/users` are unauthenticated, `/accounts`, `/cards`, `/transactions`, `/catalogs` require it).
- `src/routes/*.js` — Express routers. Always try/catch, delegate to services, respond via `responseHandler` (never raw `res.json`). Errors are pattern-matched by message string (e.g. `known.some(m => err.message?.includes(m))`) to decide 400 vs 500 — when adding service-level validation errors, keep this convention in mind on the route side.
- `src/services/*.js` — business logic + raw SQL via `mysql2/promise`. No ORM. Validation (required fields) lives here, not in routes. IDs are UUIDv4 (`uuid` package), generated in the service layer, not the DB.
- `src/connections/database.js` — single memoized pool (`getPool()`), async because production may go through `@google-cloud/cloud-sql-connector`. Branches on `NODE_ENV` (`production`/`test` → Cloud SQL connector; otherwise local MySQL via `DB_HOST`/`DB_PORT`). `NODE_ENV=test` means "cloud", not "local test run" — don't assume otherwise.
- `src/middleware/cookieJwtAuth.js` — reads JWT from `access_token` cookie OR `Authorization: Bearer` header (mobile clients use the header, browsers use the cookie).
- `src/middleware/responseHandler.js` — uniform envelope: `{ ok, message/error, timestamp, data|count }`. Use this for every response, including errors.
- Auth (`src/routes/auth.js` + `src/services/auth.js`): dual-cookie scheme — short-lived `access_token` + long-lived `refresh_token` (whitelisted in DB table `refresh_tokens`, deleted on logout/rotation). Cookie `secure`/`sameSite` flags are environment-dependent (`SameSite=None; Secure` in cloud, `Lax` locally) because cloud deployments are cross-subdomain.

### Frontend (React 19 + Vite, JSX)
- `src/router/` — `ProtectedRoute` (auth required) wraps `ProtectedUserRoute` (additionally checks `?user_id=` query param matches the authenticated user's id — routes carry `user_id` explicitly in the URL, not implied from session alone).
- `src/context/authContext.jsx` — single global auth context. On mount calls `/auth/validate` then `/users/me`. Holds `user`, `loading`, `logout`, `refreshUserData`.
- `src/utils/api.js` — central fetch wrapper:
  - `apiFetch` always sends `credentials: 'include'` and additionally attaches `Authorization: Bearer <token>` from `localStorage` if present (belt-and-suspenders alongside cookie auth, for environments where cookies don't survive, e.g. some mobile webviews).
  - `apiJson` adds automatic one-shot 401/403 retry: calls `/auth/refresh`, updates `localStorage` tokens, retries the original request once (`__retried` flag prevents loops).
  - Resource calls go through `apiGet/apiPost/apiPut/apiPatch/apiDelete` — use these rather than calling `fetch` directly.
- `VITE_API_BASE_URL` is baked in at Docker build time (see below) — changing the API base for an already-built image requires a rebuild, not a runtime env var.

### Deployment
- Both services are containerized independently (`backend/dockerfile`, `frontend/dockerfile`) and published as multi-arch images (`arm64`/`amd64`) under `jzuletadev/mf-backend` / `jzuletadev/mf-frontend`.
- Frontend container is nginx serving the built SPA; `nginx.conf` proxies `/api/*` → `http://mf-backend:8080/*` (strips the `/api` prefix) — both containers must share the same Docker network (`mis_finanzas_network`) and backend must be reachable by the name `mf-backend`.
- Full bare-metal/VM deployment steps (Cloudflare tunnel, Docker network setup, container run commands) are documented in the root `README.md` — consult it before changing deployment-related config (dockerfiles, nginx.conf, env var names).
