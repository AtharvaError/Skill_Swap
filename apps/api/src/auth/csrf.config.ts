import { doubleCsrf } from 'csrf-csrf';
import type { Request } from 'express';

export const {
  doubleCsrfProtection,
  generateCsrfToken,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET!,
  cookieName: 'x-csrf-token',
  cookieOptions: {
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    path: '/',
  },
  getCsrfTokenFromRequest: (req: Request) => req.headers['x-csrf-token'] as string,
  getSessionIdentifier: (req: Request) => req.cookies?.['jwt'] || 'anonymous',
});

export const generateToken = generateCsrfToken;
