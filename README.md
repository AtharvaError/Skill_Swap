# SkillSwap

A peer-to-peer skill exchange platform: list what you can teach and what you want to learn, get matched with people whose skills and schedule fit yours, then chat, schedule sessions and review each other.

## Features

- **Matching** — people are ranked by two-way skill fit, shared weekly availability, rating and experience. Search by name, skill, category or college.
- **Connection requests** — connecting is a request the other person accepts or declines. Chat and scheduling open once it is accepted.
- **Real-time chat** — Socket.IO messaging with presence and typing indicators, plus an inbox of conversations.
- **Sessions** — schedule a session with a topic and notes, add it to your calendar, join the video call, cancel, or mark it complete.
- **Reviews and badges** — rate your partner after a session. Badges (First Swap, Mentor, Top Rated, Verified skill) are awarded automatically.
- **Credits** — one credit is 15 minutes of teaching. A skill swap is free; a lesson costs the learner credits, which are held at booking, paid to the teacher when the learner confirms the lesson, and refunded if it is cancelled. Joining, badges and five-star reviews pay bonus credits. The rules live in `apps/api/src/credits/credits.rules.ts`.
- **Safety** — report a member or block them. A block works both ways: you disappear from each other's Discover, the connection ends, and upcoming sessions are cancelled with held credits refunded. Unblock from your profile.
- **Admin panel** (`/admin`) — for emails listed in `ADMIN_EMAILS`: review reports, suspend or reinstate accounts, and fulfil or reject reward requests with a note the member sees.
- **Password reset** — emailed single-use links that expire after an hour (via Resend; in development the link is printed in the API console).
- **Rewards (preview)** — a catalogue where credits earned by teaching can be redeemed. Nothing is issued yet: redeeming records a pending request that can be cancelled for a refund. See `apps/api/src/rewards/rewards.catalog.ts` for what going live needs.
- **Profiles and leaderboard** — public profiles with skills, availability, badges and reviews; a leaderboard ranked by completed sessions.

Optional integrations, each enabled by setting its environment variables:

| Integration | Without it | With it |
|---|---|---|
| Google Calendar | "Add to Google Calendar" link on every session | Events with a Meet link are created automatically and your partner is invited |
| Daily.co | Video opens in a new tab (Google Meet, or a meet.jit.si room) | Video call embedded in the session page |

## Monorepo structure

- `apps/web` — Next.js 16 (App Router), React 19, Tailwind 4, React Query
- `apps/api` — NestJS 11, Prisma 7, PostgreSQL, Socket.IO
- `packages/shared` — shared TypeScript types

## Getting started

Requires Node.js 20+ and a PostgreSQL database ([Neon](https://neon.tech) works well, or run `docker-compose up -d` for a local one).

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure the API. Copy `apps/api/.env.example` to `apps/api/.env`, set `DATABASE_URL`, and generate the three secrets as described in the file.
3. Create the database tables:
   ```bash
   npm run db:migrate
   ```
4. Optionally load a demo community (eight accounts with skills, connections, sessions and reviews):
   ```bash
   npm run db:seed
   ```
   The demo accounts are `<name>@demo.skillswap.test`; the shared password is `DEMO_PASSWORD` in `apps/api/prisma/seed.ts`. `npm run db:seed:reset` removes them again.
5. Run both apps:
   ```bash
   npm run dev
   ```

The web app is at `http://localhost:3000` and the API at `http://localhost:3001`. If the web app runs on another origin, set `ALLOWED_ORIGIN` in `apps/api/.env` to match.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Run the API and web app in watch mode |
| `npm run build` | Production build of both apps |
| `npm run lint` | Lint both apps |
| `npm test` | API unit tests |
| `npm run test:e2e --workspace=apps/api` | API tests against the configured database |
| `npm run test:smoke --workspace=apps/api` | End-to-end HTTP checks against a running API with demo data (needs bash) |
| `npm run db:migrate` | Apply pending database migrations |
| `npm run db:seed` / `db:seed:reset` | Load or remove the demo community |

After changing `apps/api/prisma/schema.prisma`, create a migration from `apps/api` with `npx prisma migrate dev --name <change>`.

## More

- [DEPLOYMENT.md](DEPLOYMENT.md) — deploying the web app, API and database
- [SECURITY.md](SECURITY.md) — the security measures in place
