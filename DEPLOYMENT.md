# SkillSwap Deployment Guide

## Architecture

- **Web** — Next.js 16 frontend (`/apps/web`) → Deploys to **Vercel**
- **API** — NestJS backend (`/apps/api`) → Deploys to **Render** or **Railway**
- **Database** — PostgreSQL (hosted on **Neon** or **Supabase**)
- **Real-time** — WebSocket (Socket.IO) on the API server
- **Video** — Daily.co Prebuilt (optional)

---

## 1. Provision a PostgreSQL Database

### Option A: Neon (Serverless Postgres)

1. Create an account at [neon.tech](https://neon.tech)
2. Create a new project → copy both connection strings:
   - the **pooled** one (host contains `-pooler`) → `DATABASE_URL`
   - the **direct** one → `DATABASE_URL_UNPOOLED` (used for migrations)

### Option B: Supabase

1. Create an account at [supabase.com](https://supabase.com)
2. Create a new project → go to **Project Settings → Database**
3. Copy the **URI connection string** (with password) → `DATABASE_URL`

### Apply the schema

With the connection strings in `apps/api/.env`:

```bash
npm run db:migrate
```

The Docker image runs this automatically on every start, so deployed databases stay up to date.

---

## 2. Environment Variables (Production)

Set these environment variables in your hosting provider:

### Web (`apps/web`) — Vercel

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL of the deployed API (e.g. `https://api.skillswap.app`) |

### API (`apps/api`) — Render / Railway

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (pooled is fine) | ✅ |
| `DATABASE_URL_UNPOOLED` | Direct connection string, used for migrations | Neon only |
| `JWT_SECRET` | 64-byte hex string for access tokens | ✅ |
| `JWT_REFRESH_SECRET` | 64-byte hex string for refresh tokens | ✅ |
| `CSRF_SECRET` | 64-byte hex string for CSRF protection | ✅ |
| `ALLOWED_ORIGIN` | Web app URL for CORS (e.g. `https://skillswap.app`); comma-separate several | ✅ |
| `FRONTEND_URL` | Web app URL that OAuth redirects return to | ✅ |
| `NODE_ENV` | Set to `production` | ✅ |
| `PORT` | Server port (default: `3001`) | Optional |
| `COOKIE_SAMESITE` | `strict`, `lax` or `none`. Defaults to `none` in production | Optional |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID | Optional (calendar) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client Secret | Optional (calendar) |
| `GOOGLE_OAUTH_REDIRECT_URI` | Must be `<API URL>/calendar/oauth2callback`, and registered in the Google Cloud console | Optional (calendar) |
| `DAILY_API_KEY` | Daily.co API key for in-app video calls | Optional (video) |

Generate strong secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Cookies across two domains

Sign-in uses httpOnly cookies set by the API. When the web app and API are on different sites (the usual Vercel + Render setup), the cookies are sent with `SameSite=None; Secure`, which requires HTTPS on both. Some browsers block such third-party cookies (Safari by default, Chrome in Incognito). To avoid that, serve both from one site, for example `skillswap.app` and `api.skillswap.app`, and set `COOKIE_SAMESITE=lax`.

---

## 3. Deploy the API

### Using Docker (Render / Railway)

`apps/api/Dockerfile` must be built **from the repository root**, because it needs the workspace lockfile:

```bash
docker build -f apps/api/Dockerfile -t skillswap-api .
```

**Render:**
1. Create a **New Web Service** and connect your GitHub repo
2. Leave **Root Directory** empty
3. Set **Runtime** to `Docker` and **Dockerfile Path** to `apps/api/Dockerfile`
4. Add all environment variables from the table above
5. Set the health check path to `/health`
6. Deploy

**Railway:**
1. Create a **New Project** → **Deploy from GitHub repo**
2. Leave the root directory as the repository root and set the Dockerfile path to `apps/api/Dockerfile`
3. Add all environment variables
4. Deploy

### Without Docker

From the repository root:

```bash
npm ci
npm run db:migrate
npm run build --workspace=apps/api
npm run start:prod --workspace=apps/api
```

---

## 4. Deploy the Web Frontend

### Vercel

1. Connect your GitHub repo to Vercel
2. Set **Root Directory** to `apps/web` in the project settings
3. Add the `NEXT_PUBLIC_API_URL` environment variable in the project settings
4. Deploy

---

## 5. CI/CD

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push:

- **Lint** — `npm run lint` (both apps)
- **Test** — `npm test` (API unit tests)
- **Build API** — `npm run build --workspace=apps/api`
- **Build Web** — `npm run build --workspace=apps/web`

---

## 6. Post-Deployment Checklist

- [ ] API health endpoint responds at `GET /health` with `"database": "ok"`
- [ ] Web app loads and communicates with the API
- [ ] Signup / Login flow works end-to-end, and you stay signed in after a reload
- [ ] Discover returns ranked matches
- [ ] A connection request can be sent, accepted and declined
- [ ] Chat WebSocket connects and messages arrive in real time
- [ ] A session can be scheduled, joined, completed and reviewed
- [ ] If configured: Google Calendar events are created and Daily.co calls open in the page
- [ ] Rate limiting is active (300 req/min per IP, stricter on auth routes)
- [ ] CSRF protection is working on state-changing requests
