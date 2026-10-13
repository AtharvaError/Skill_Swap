# Security Hardening — SkillSwap

This document summarises the OWASP-aligned security measures implemented across the SkillSwap platform.

---

## 1. Authentication & Session Management

| Measure | Implementation |
|---------|---------------|
| Short-lived access tokens | JWT with 15-minute `expiresIn` |
| Refresh token rotation | 7-day refresh token, rotated on every use. Only its SHA-256 hash is stored, so a rotated-out token stops working immediately |
| Server-side logout | Logout sets `refreshTokenHash = null` in the database, invalidating the refresh token |
| httpOnly cookies | Access and refresh tokens are stored in `jwt` / `jwt_refresh` cookies with `httpOnly: true`. The refresh cookie is scoped to `/auth` |
| Secure flag | Cookies are `Secure` in production and whenever `SameSite=None` |
| SameSite | `Lax` in development. `None` in production, because the web app and API are normally on different sites; set `COOKIE_SAMESITE=strict` or `lax` when they share a site |
| Password hashing | bcrypt with 10 salt rounds |
| Startup validation | Server refuses to start if `JWT_SECRET`, `JWT_REFRESH_SECRET` or `CSRF_SECRET` are missing or hold placeholder values, or if `DATABASE_URL` is not a PostgreSQL URL |

Refresh tokens are deliberately **not** hashed with bcrypt: bcrypt only reads the first 72 bytes of its input, which are identical for every JWT issued to the same user, so old tokens would keep matching.

**Files:** `apps/api/src/auth/`

---

## 2. HTTP Security Headers (Helmet + CSP)

Helmet is applied globally to API responses with a custom Content-Security-Policy:

| Directive | Allowlist |
|-----------|-----------|
| `default-src` | `'self'` |
| `connect-src` | `'self'`, `https://*.daily.co`, `wss://*.daily.co` |
| `frame-src` | `'self'`, `https://*.daily.co`, `https://calendar.google.com` |
| `script-src` | `'self'` |
| `style-src` | `'self'`, `'unsafe-inline'`, `fonts.googleapis.com` |
| `font-src` | `'self'`, `fonts.gstatic.com` |
| `img-src` | `'self'`, `data:`, `*.googleusercontent.com` |

**File:** `apps/api/src/main.ts`

---

## 3. CSRF Protection

Double-submit cookie pattern via the `csrf-csrf` library:

- CSRF cookie (`x-csrf-token`) is httpOnly and follows the same SameSite/Secure policy as the auth cookies
- All state-changing requests (POST, PUT, PATCH, DELETE) require the `X-CSRF-Token` header
- Tokens are bound to the signed-in user, so a token minted for one account (or for an anonymous visitor) is rejected for another
- The web client fetches a token before its first state-changing request, drops it whenever the session changes (login, signup, logout, refresh), and retries once with a fresh token on a CSRF failure

With `SameSite=None` in production, this CSRF check and the CORS allow-list are what stop cross-site requests, so both must stay enabled.

**Files:** `apps/api/src/auth/csrf.config.ts`, `apps/web/src/lib/api.ts`

---

## 4. Rate Limiting

Applied via `@nestjs/throttler`, per client IP. In production the API trusts one proxy hop (`trust proxy`) so the limit applies to the real client rather than the hosting platform's proxy.

| Scope | Limit | Window |
|-------|-------|--------|
| Global | 300 requests | 60 seconds |
| `POST /auth/signup` | 10 requests | 60 seconds |
| `POST /auth/login` | 10 requests | 60 seconds |
| `PATCH /users/me` | 10 requests | 60 seconds |
| `POST /sessions` | 20 requests | 60 seconds |
| `POST /sessions/:id/review` | 10 requests | 60 seconds |
| `POST /matches/connect/:userId` | 20 requests | 60 seconds |
| `POST /skills/offered` | 20 requests | 60 seconds |
| `POST /skills/wanted` | 20 requests | 60 seconds |
| `POST /rewards/:rewardId/redeem` | 10 requests | 60 seconds |
| `POST /rewards/redemptions/:id/cancel` | 10 requests | 60 seconds |

WebSocket chat events are not rate limited.

**File:** `apps/api/src/app.module.ts`

---

## 5. Input Validation

- Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- Route ids are validated with `ParseUUIDPipe`
- All DTOs use `class-validator` decorators:

| DTO | Key Validations |
|-----|----------------|
| `SignupDto` | `@IsEmail` (trimmed, lower-cased), `@MinLength(6)` / `@MaxLength(128)` on password, `@MaxLength(100)` on name |
| `LoginDto` | `@IsEmail` (trimmed, lower-cased), `@MaxLength(128)` on password |
| `UpdateProfileDto` | `@MaxLength(100)` on name, `@MaxLength(500)` on bio, `@MaxLength(200)` on college, `@IsUrl` (http/https only) on avatarUrl, `@IsIn` on each availability slot |
| `CreateSessionDto` | `@IsUUID`, `@IsISO8601`, `@IsInt` with `@Min(15)` / `@Max(240)`, `@MaxLength` on topic and notes |
| `CreateReviewDto` | `@IsInt` with `@Min(1)` / `@Max(5)`, `@MaxLength(1000)` on comment |
| `SendMessageDto` | `@MaxLength(1000)` on content |
| `CreateOfferedSkillDto` / `CreateWantedSkillDto` | `@MaxLength(60)` on name, `@IsEnum(SkillProficiency)` |
| `JoinRoomDto` / `TypingDto` | `@IsString`, `@IsNotEmpty` |

---

## 6. Authorization & Data Exposure

- Every match, message and session endpoint checks that the caller is one of the two participants. Other people's resources return 404, so ids cannot be probed.
- Connecting requires consent: a request stays `PENDING` until the recipient accepts. Chat history, the chat socket room and session scheduling all require an `ACCEPTED` connection.
- Responses about other users are built from an explicit allow-list (`userSummarySelect`: id, name, avatar, college, rating). Password hashes, refresh-token hashes, Google refresh tokens and email addresses are never included.
- The chat gateway authenticates during the WebSocket handshake from the httpOnly access cookie.

**Files:** `apps/api/src/users/user-summary.ts`, `apps/api/src/matches/`, `apps/api/src/sessions/`, `apps/api/src/chat/`

---

## 6a. Credits and Rewards Integrity

- `User.credits` is only changed by `CreditsService`, always in the same database transaction as an append-only `CreditTransaction` row, so a balance equals the sum of its ledger.
- Spending checks the balance and decrements it in one statement, so two simultaneous requests cannot spend the same credits. Balances cannot go negative.
- Every payout, refund and bonus carries an idempotency key (unique per user), so retried or repeated requests never pay twice.
- A lesson is always booked by the learner, so nobody's credits are committed by someone else. The learner releases the payment by confirming the lesson; the teacher can only confirm it 24 hours after it ends. After a lesson starts, only the teacher can cancel it (which refunds the learner).
- Only credits earned by teaching can be redeemed; bonus credits cannot. Redemptions are serialised per member with a row lock.

Known limits before rewards carry real value: nothing verifies that a lesson actually took place, and a group of colluding accounts can still move their sign-up bonuses to one member by booking lessons with them. Add proof of attendance, earning caps and a minimum account age before issuing anything with cash value.

**Files:** `apps/api/src/credits/`, `apps/api/src/rewards/`, `apps/api/src/sessions/sessions.service.ts`

---

## 7. CORS

Only the origins listed in `ALLOWED_ORIGIN` (comma-separated) are allowed, for both HTTP and the chat socket. Credentials (cookies) are enabled.

**File:** `apps/api/src/main.ts`

---

## 8. Frontend XSS Prevention

All user-supplied text (chat messages, bios, reviews, skill names, session topics and notes) is rendered by React as plain text. The codebase has no `dangerouslySetInnerHTML`.

Avatar URLs are restricted to `http`/`https` on the server and fall back to the user's initial when they fail to load.

---

## 9. Database & ORM

- Prisma ORM uses parameterized queries — no SQL injection vector
- User-supplied data never concatenated into raw queries
- The Google OAuth `state` parameter is HMAC-signed and expires after 10 minutes

---

## 10. Production Checklist

Before deploying to production:

1. [ ] Generate strong secrets and set all environment variables:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   Set `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `CSRF_SECRET`.

2. [ ] Set `NODE_ENV=production` to enable Secure cookies and proxy-aware rate limiting.

3. [ ] Set `ALLOWED_ORIGIN` and `FRONTEND_URL` to the production web URL.

4. [ ] Serve both apps over HTTPS (required for `SameSite=None` cookies).

5. [ ] Consider encrypting `User.googleRefreshToken` at rest; it is currently stored as plain text.

6. [ ] Consider rate limiting chat socket events.
