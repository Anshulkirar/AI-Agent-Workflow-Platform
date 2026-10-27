ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base
RUN apk add --no-cache libc6-compat
WORKDIR /repo

FROM base AS pruner
RUN npm install -g turbo@^2.5.0
COPY . .
RUN turbo prune @agentflow/web --docker

FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=pruner /repo/out/json/ .
COPY --from=pruner /repo/out/package-lock.json ./package-lock.json
RUN npm ci
COPY --from=pruner /repo/out/full/ .
# `turbo prune` only copies workspaces; every package's tsconfig extends this root file.
COPY tsconfig.base.json ./
RUN npx turbo run build --filter=@agentflow/web

FROM node:${NODE_VERSION} AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /repo
COPY --from=builder --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
