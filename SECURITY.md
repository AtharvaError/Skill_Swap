# Security Hardening — SkillSwap

This document summarises the OWASP-aligned security measures implemented across the SkillSwap platform.

---

## 1. Authentication & Session Management

| Measure | Implementation |
|---------|---------------|
| Short-lived access tokens | JWT with 15-minute `expiresIn` |
| Refresh token rotation | 7-day refresh token; hashed with bcrypt before storage; rotated on each use |
| Server-side logout | Logout sets `refreshTokenHash = null` in the database, invalidating all refresh tokens |
| httpOnly cookies | Access and refresh tokens are stored in `jwt` / `jwt_refresh` cookies with `httpOnly: true` |
| Secure flag | Cookies use `secure: true` when `NODE_ENV === 'production'` |
| SameSite=Strict | All cookies set with `sameSite: 'strict'` |
| Password hashing | bcrypt with 10 salt rounds |
| Startup validation | Server refuses to start if `JWT_SECRET` or `JWT_REFRESH_SECRET` contain placeholder values |
| CSRF secret | `CSRF_SECRET` environment variable must be set |

**Files:** `apps/api/src/auth/`

---

## 2. HTTP Security Headers (Helmet + CSP)

Helmet is applied globally with a custom Content-Security-Policy:

| Directive | Allowlist |
|-----------|-----------|
| `default-src` | `'self'` |
| `connect-src` | `'self'`, `https://*.daily.co`, `wss://*.daily.co` |
| `frame-src` | `'self'`, `https://*.daily.co`, `https://calendar.google.com` |
| `script-src` | `'self'`, `'unsafe-inline'` (required by Next.js dev mode) |
| `style-src` | `'self'`, `'unsafe-inline'`, `fonts.googleapis.com` |
| `font-src` | `'self'`, `fonts.gstatic.com` |
| `img-src` | `'self'`, `data:`, `*.googleusercontent.com` |

**File:** `apps/api/src/main.ts`

---

## 3. CSRF Protection

Double-submit cookie pattern via the `csrf-csrf` library:

- CSRF cookie (`x-csrf-token`) set as httpOnly, Secure, SameSite=Strict
- All state-changing requests (POST, PUT, PATCH, DELETE) require the `X-CSRF-Token` header
- Frontend auto-fetches and attaches the CSRF token via Axios request interceptor
- On 403, the frontend retries once with a fresh token

**Files:** `apps/api/src/auth/csrf.config.ts`, `apps/web/src/lib/api.ts`

---

## 4. Rate Limiting

Applied via `@nestjs/throttler`:

| Scope | Limit | Window |
|-------|-------|--------|
| Global | 100 requests | 60 seconds |
| `POST /auth/signup` | 10 requests | 60 seconds |
| `POST /auth/login` | 10 requests | 60 seconds |
| `PATCH /users/me` | 10 requests | 60 seconds |
| `POST /sessions` | 20 requests | 60 seconds |
| `POST /sessions/:id/review` | 10 requests | 60 seconds |
| `POST /matches/connect/:userId` | 20 requests | 60 seconds |
| `POST /skills/offered` | 20 requests | 60 seconds |
| `POST /skills/wanted` | 20 requests | 60 seconds |

**File:** `apps/api/src/app.module.ts`

---

## 5. Input Validation

- Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- All DTOs use `class-validator` decorators:

| DTO | Key Validations |
|-----|----------------|
| `SignupDto` | `@IsEmail`, `@MinLength(6)` / `@MaxLength(128)` on password, `@MaxLength(100)` on name |
| `LoginDto` | `@IsEmail`, `@MaxLength(128)` on password |
| `UpdateProfileDto` | `@MaxLength(100)` on name, `@MaxLength(500)` on bio, `@MaxLength(200)` on college, `@IsUrl` on avatarUrl |
| `CreateSessionDto` | `@IsISO8601`, `@IsInt` with `@Min(15)` / `@Max(240)` |
| `CreateReviewDto` | `@IsInt` with `@Min(1)` / `@Max(5)`, `@MaxLength(1000)` on comment |
| `SendMessageDto` | `@MaxLength(1000)` on content |
| `CreateOfferedSkillDto` | `@IsEnum(SkillProficiency)` |
| `JoinRoomDto` / `TypingDto` | `@IsString`, `@IsNotEmpty` |

---

## 6. CORS

Configured to allow only the frontend origin specified in the `ALLOWED_ORIGIN` environment variable. Credentials (cookies) enabled.

**File:** `apps/api/src/main.ts`

---

## 7. Frontend XSS Prevention

| Surface | Protection |
|---------|-----------|
| Chat messages | `dangerouslySetInnerHTML` used with `DOMPurify.sanitize()` — strips all dangerous HTML before rendering |
| Profile bio | Rendered as plain text in `<p>` — no HTML injection possible |
| Reviews / comments | Rendered as plain text in `<p>` — no HTML injection possible |
| Skill names / categories | Rendered as plain text in badge/tag components — no HTML injection |
| Avatar URLs | Server-side `@IsUrl()` validation; client-side `onError` fallback on `<img>` |
| No raw HTML injection points | Codebase scanned; the only `dangerouslySetInnerHTML` usage is the chat, which is sanitized |

---

## 8. Database & ORM

- Prisma ORM uses parameterized queries — no SQL injection vector
- User-supplied data never concatenated into raw queries
- Refresh tokens hashed with bcrypt before storage

---

## 9. Production Checklist

Before deploying to production:

1. [ ] Generate strong secrets and set all environment variables:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   Set `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `CSRF_SECRET`.

2. [ ] Set `NODE_ENV=production` to enable Secure cookie flag and stricter CSP.

3. [ ] Set `ALLOWED_ORIGIN` to the production frontend URL.

4. [ ] Remove `'unsafe-inline'` from `script-src` in CSP for production (Next.js build outputs static hashes).

5. [ ] Use a proper database (PostgreSQL via Docker Compose) instead of SQLite.

6. [ ] Enable `cookie-parser` signed cookies with a secret for cookie integrity verification.
