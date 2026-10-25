# Shared image for Node services (api, worker). Build with: --build-arg APP=<name>
ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base
RUN apk add --no-cache libc6-compat
WORKDIR /repo

# 1. Prune the monorepo down to the target app and its workspace deps
FROM base AS pruner
ARG APP
RUN npm install -g turbo@^2.5.0
COPY . .
RUN turbo prune @agentflow/${APP} --docker

# 2. Install deps (cached layer), then build
FROM base AS builder
ARG APP
COPY --from=pruner /repo/out/json/ .
COPY --from=pruner /repo/out/package-lock.json ./package-lock.json
RUN npm ci
COPY --from=pruner /repo/out/full/ .
# `turbo prune` only copies workspaces; every package's tsconfig extends this root file.
COPY tsconfig.base.json ./
RUN npx turbo run build --filter=@agentflow/${APP} && npm prune --omit=dev

# 3. Minimal runtime
FROM node:${NODE_VERSION} AS runner
ARG APP
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=builder --chown=node:node /repo .
WORKDIR /repo/apps/${APP}
USER node
CMD ["node", "dist/index.js"]
