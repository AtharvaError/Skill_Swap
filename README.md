# SkillSwap

A peer-to-peer skill exchange platform.

## Monorepo Structure

- `/apps/web`: Next.js 15 frontend
- `/apps/api`: NestJS backend
- `/packages/shared`: Shared TypeScript types

## Getting Started

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Copy `.env.example` to `.env` in the root, `apps/web`, and `apps/api`.
4. Start the database:
   ```bash
   docker-compose up -d
   ```
5. Run the apps:
   ```bash
   npm run dev
   ```

The frontend will be at `http://localhost:3000` and the backend at `http://localhost:3001`.
