import { config } from 'dotenv';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

// Prisma CLI commands are run from apps/api. Load apps/api/.env first, then the
// monorepo root .env as a fallback for anything not set there.
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '../../.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    // Migrations need a direct (non-pooled) connection; Neon exposes one as
    // DATABASE_URL_UNPOOLED. Fall back to DATABASE_URL elsewhere.
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
  },
});
