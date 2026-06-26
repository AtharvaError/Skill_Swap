# SkillSwap Deployment Guide

## Architecture

- **Web** — Next.js 16 frontend (`/apps/web`) → Deploys to **Vercel**
- **API** — NestJS backend (`/apps/api`) → Deploys to **Render** or **Railway**
- **Database** — PostgreSQL (hosted on **Neon** or **Supabase**)
- **Real-time** — WebSocket (Socket.IO) on the API server
- **Video** — Daily.co Prebuilt

---

## 1. Provision a PostgreSQL Database

### Option A: Neon (Serverless Postgres)

1. Create an account at [neon.tech](https://neon.tech)
2. Create a new project → copy the **connection string**
3. It will look like: `postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`

### Option B: Supabase

1. Create an account at [supabase.com](https://supabase.com)
2. Create a new project → go to **Project Settings → Database**
3. Copy the **URI connection string** (with password)
4. Enable SSL mode

### Migrate the schema

Replace the `provider` in `apps/api/prisma/schema.prisma` from `sqlite` to `postgresql`, then run:

```bash
cd apps/api
npx prisma generate
npx prisma db push
```

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
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `JWT_SECRET` | 64-byte hex string for access tokens | ✅ |
| `JWT_REFRESH_SECRET` | 64-byte hex string for refresh tokens | ✅ |
| `CSRF_SECRET` | 64-byte hex string for CSRF protection | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID | Optional (calendar) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client Secret | Optional (calendar) |
| `GOOGLE_OAUTH_REDIRECT_URI` | OAuth redirect URI (e.g. `https://api.skillswap.app/calendar/oauth`) | Optional (calendar) |
| `DAILY_API_KEY` | Daily.co API key for video calls | Optional (video) |
| `LLM_API_KEY` | LLM API key for AI matching | Optional (matching) |
| `ALLOWED_ORIGIN` | Frontend URL for CORS (e.g. `https://skillswap.app`) | ✅ |
| `PORT` | Server port (default: `3001`) | Optional |
| `NODE_ENV` | Set to `production` | ✅ |

Generate strong secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 3. Deploy the API

### Using Docker (Render / Railway)

A `Dockerfile` is provided at `apps/api/Dockerfile`. The hosting platform will use it automatically.

**Render:**
1. Create a **New Web Service**
2. Connect your GitHub repo
3. Set **Root Directory** to `apps/api`
4. Set **Runtime** to `Docker`
5. Add all environment variables from the table above
6. Deploy

**Railway:**
1. Create a **New Project** → **Deploy from GitHub repo**
2. Set **Root Directory** to `apps/api`
3. The `Dockerfile` will be detected automatically
4. Add all environment variables
5. Deploy

### Without Docker

```bash
cd apps/api
npm ci
npx prisma generate
npx prisma db push
npm run build
npm run start:prod
```

---

## 4. Deploy the Web Frontend

### Vercel

1. Connect your GitHub repo to Vercel
2. Set **Root Directory** to `apps/web`
3. A `vercel.json` is provided — it will be detected automatically
4. Add `NEXT_PUBLIC_API_URL` environment variable
5. Deploy

Required Vercel environment variables:
- `NEXT_PUBLIC_API_URL` — the full URL of your deployed API (e.g. `https://api.skillswap.app`)

---

## 5. CI/CD

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push:

- **Lint** — `npm run lint`
- **Build API** — `npm run build --workspace=apps/api`
- **Build Web** — `npm run build --workspace=apps/web`

---

## 6. Post-Deployment Checklist

- [ ] API health endpoint responds at `GET /health`
- [ ] Web app loads and communicates with the API
- [ ] Signup / Login flow works end-to-end
- [ ] Skill matching returns results
- [ ] Chat WebSocket connects successfully
- [ ] Session scheduling creates Google Calendar events
- [ ] Daily.co video calls launch in the browser
- [ ] Reviews and badges are awarded correctly
- [ ] Rate limiting is active (100 req/min per IP)
- [ ] CSRF protection is working on state-changing requests
