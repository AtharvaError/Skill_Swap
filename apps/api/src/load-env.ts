import { config } from 'dotenv';
import { resolve } from 'path';

// Imported first by main.ts so every module sees the environment.
// Resolved relative to this file so it works from any cwd, in src/ and dist/.
// apps/api/.env wins; the monorepo root .env fills in anything it leaves unset.
config({ path: resolve(__dirname, '../.env') });
config({ path: resolve(__dirname, '../../../.env') });
