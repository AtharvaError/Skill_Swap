import type { CookieOptions } from 'express';

type SameSite = 'strict' | 'lax' | 'none';

/**
 * SameSite policy for the auth and CSRF cookies.
 *
 * In production the web app and the API usually live on different sites
 * (e.g. Vercel + Render), where only SameSite=None cookies are sent with
 * credentialed requests. Locally both run on localhost, so Lax is enough.
 * Override with COOKIE_SAMESITE (strict | lax | none) when both are served
 * from the same site.
 */
export function cookieSameSite(): SameSite {
  const configured = process.env.COOKIE_SAMESITE?.toLowerCase();
  if (
    configured === 'strict' ||
    configured === 'lax' ||
    configured === 'none'
  ) {
    return configured;
  }
  return process.env.NODE_ENV === 'production' ? 'none' : 'lax';
}

export function baseCookieOptions(): CookieOptions {
  const sameSite = cookieSameSite();
  return {
    httpOnly: true,
    sameSite,
    // Browsers reject SameSite=None cookies that are not Secure.
    secure: process.env.NODE_ENV === 'production' || sameSite === 'none',
  };
}

export const ACCESS_COOKIE = 'jwt';
export const REFRESH_COOKIE = 'jwt_refresh';

export const accessCookieOptions = (): CookieOptions => ({
  ...baseCookieOptions(),
  path: '/',
});

export const refreshCookieOptions = (): CookieOptions => ({
  ...baseCookieOptions(),
  path: '/auth',
});

/** Origins allowed by CORS; ALLOWED_ORIGIN may be a comma-separated list. */
export function allowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}
