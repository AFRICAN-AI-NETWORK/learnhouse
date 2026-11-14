FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk update && apk add --no-cache libc6-compat && rm -rf /var/cache/apk/*
WORKDIR /app

# Install dependencies with BuildKit pnpm store cache
COPY package.json pnpm-lock.yaml* ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    corepack enable pnpm && pnpm i --frozen-lockfile

# Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Remove .env files from the build image to prevent leaking secrets
RUN rm -f .env*

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build Next.js with pnpm store & Next.js cache mounts
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    --mount=type=cache,id=next-cache,target=/app/.next/cache \
    corepack enable pnpm && pnpm run build

# Production image
FROM base AS runner
WORKDIR /app

# Install curl for health checks
RUN apk update && apk add --no-cache curl && rm -rf /var/cache/apk/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy server wrapper for runtime environment variable injection
COPY --chown=nextjs:nodejs server-wrapper.js ./
RUN chmod +x server-wrapper.js

# Copy entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create runtime-config.json placeholder
RUN touch runtime-config.json && chown nextjs:nodejs runtime-config.json

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/api/health || curl -f http://localhost:${PORT:-3000}/ || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
