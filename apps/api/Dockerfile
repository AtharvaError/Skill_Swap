# Build from the monorepo root so the workspace lockfile is available:
#   docker build -f apps/api/Dockerfile -t skillswap-api .

# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Every workspace manifest must be present for the lockfile to be in sync,
# but only the API's dependencies are installed.
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN npm ci --workspace=apps/api --include-workspace-root \
  && mkdir -p apps/api/node_modules

COPY apps/api ./apps/api

# Generate Prisma client and build
WORKDIR /app/apps/api
RUN npm run build

# ---- Production stage ----
FROM node:20-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

# Keep the workspace layout: dependencies are hoisted to the root
# node_modules, with a few nested under apps/api/node_modules.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3001}/health || exit 1

# Apply any pending migrations, then start the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
