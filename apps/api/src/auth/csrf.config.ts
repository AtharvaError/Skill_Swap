import { doubleCsrf } from 'csrf-csrf';
import type { Request } from 'express';
import { ACCESS_COOKIE, baseCookieOptions } from './cookie.config';

/**
 * Binds a CSRF token to the signed-in user. The access-token cookie is only
 * decoded here (AuthGuard does the verification): using the user id rather
 * than the raw token keeps CSRF tokens valid across access-token rotation.
 */
function sessionIdentifier(req: Request): string {
  const token = (req.cookies as Record<string, string> | undefined)?.[
    ACCESS_COOKIE
  ];
  const payload = token?.split('.')[1];
  if (!payload) return 'anonymous';
  try {
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as { sub?: unknown };
    return typeof decoded.sub === 'string' ? decoded.sub : 'anonymous';
  } catch {
    return 'anonymous';
  }
}

export const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET!,
  cookieName: 'x-csrf-token',
  cookieOptions: { ...baseCookieOptions(), path: '/' },
  getCsrfTokenFromRequest: (req: Request) => req.headers['x-csrf-token'],
  getSessionIdentifier: sessionIdentifier,
});

export const generateToken = generateCsrfToken;
