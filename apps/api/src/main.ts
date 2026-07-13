import { config } from 'dotenv';
import { resolve } from 'path';
// Explicitly resolve .env relative to this file so it works from any cwd
// (monorepo root run or direct apps/api run, both src/ and dist/)
config({ path: resolve(__dirname, '../.env') });
config(); // fallback: also load process.cwd()/.env if the above doesn't match

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { doubleCsrfProtection } from './auth/csrf.config';

async function bootstrap() {
  // Validate required secrets before starting
  const requiredVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'CSRF_SECRET'];
  for (const v of requiredVars) {
    if (!process.env[v] || process.env[v]?.startsWith('change-me')) {
      throw new Error(
        `${v} is not set or contains a placeholder value. Generate a strong random string:\n` +
        `  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`,
      );
    }
  }

  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());

  // CORS configuration from environment variables
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
  app.enableCors({
    origin: allowedOrigin,
    credentials: true,
  });

  // Helmet middleware for secure HTTP headers, with custom Content-Security-Policy (CSP)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: ["'self'", "https://*.daily.co", "wss://*.daily.co"],
          frameSrc: ["'self'", "https://*.daily.co", "https://calendar.google.com"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
          fontSrc: ["'self'", "fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "*.googleusercontent.com"],
        },
      },
    }),
  );

  // CSRF protection middleware for all state-changing requests
  app.use(doubleCsrfProtection);

  // Global validation pipe with whitelist and forbidNonWhitelisted enabled
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
