// Must stay first: modules below read process.env while they are imported.
import './load-env';

import { NestFactory } from '@nestjs/core';
import { ForbiddenException, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { doubleCsrfProtection } from './auth/csrf.config';
import { allowedOrigins } from './auth/cookie.config';

const PLACEHOLDER_PREFIXES = ['change-me', 'replace_with'];

function assertRequiredEnv() {
  for (const name of ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'CSRF_SECRET']) {
    const value = process.env[name]?.toLowerCase();
    if (!value || PLACEHOLDER_PREFIXES.some((p) => value.startsWith(p))) {
      throw new Error(
        `${name} is not set or contains a placeholder value. Generate a strong random string:\n` +
          `  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`,
      );
    }
  }
  if (!process.env.DATABASE_URL?.startsWith('postgres')) {
    throw new Error(
      'DATABASE_URL must be a PostgreSQL connection string (postgresql://...).',
    );
  }
}

async function bootstrap() {
  assertRequiredEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Hosting platforms put the API behind one proxy hop. Without this every
  // request appears to come from the proxy and shares a single rate limit.
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(cookieParser());

  app.enableCors({
    origin: allowedOrigins(),
    credentials: true,
  });

  // Helmet middleware for secure HTTP headers, with custom Content-Security-Policy (CSP)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: ["'self'", 'https://*.daily.co', 'wss://*.daily.co'],
          frameSrc: [
            "'self'",
            'https://*.daily.co',
            'https://calendar.google.com',
          ],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
          fontSrc: ["'self'", 'fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', '*.googleusercontent.com'],
        },
      },
    }),
  );

  // CSRF protection middleware for all state-changing requests. A bad or
  // missing token is an expected client error, so it is turned into a plain
  // 403 instead of being logged as an unhandled server error.
  app.use((req: Request, res: Response, next: NextFunction) =>
    doubleCsrfProtection(req, res, (error?: unknown) =>
      next(error ? new ForbiddenException('invalid csrf token') : undefined),
    ),
  );

  // Global validation pipe with whitelist and forbidNonWhitelisted enabled
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
