# Trigger-engine worker (Railway/Render/Fly deploy target).
# Build context is the REPO ROOT: docker build -f services/worker/Dockerfile .
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

# Install with the workspace lockfile; only what the worker graph needs.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY services/worker/package.json services/worker/
COPY packages/schema/package.json packages/schema/
COPY packages/permissions/package.json packages/permissions/
RUN pnpm install --frozen-lockfile --filter @wellkept/worker...

# Source (Node 24 runs the TS directly; no build step).
COPY tsconfig.base.json ./
COPY packages/schema packages/schema
COPY packages/permissions packages/permissions
COPY services/worker services/worker

ENV NODE_ENV=production WK_WORKER_MAIN=1
WORKDIR /app/services/worker
CMD ["node", "src/index.ts"]
