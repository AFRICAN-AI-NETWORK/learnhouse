FROM node:22-alpine AS base

# Builder stage
FROM base AS builder
RUN apk update && apk add --no-cache libc6-compat && rm -rf /var/cache/apk/*
WORKDIR /app

# Enable pnpm once for the builder stage
RUN corepack enable pnpm

# Install dependencies with layer caching and BuildKit store cache
# Eliminates separate deps stage to avoid copying 60,000+ files across Docker layers (saves ~9 min)
COPY package.json pnpm-lock.yaml* ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm i --frozen-lockfile

# Copy application source code directly
COPY . .

# Remove local .env files to prevent leaking build-time secrets
RUN rm -f .env*

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Provide build arguments with production defaults
ARG NEXT_PUBLIC_LEARNHOUSE_API_URL="https://lms-backend.africanainetwork.com/api/v1/"
ARG NEXT_PUBLIC_LEARNHOUSE_BACKEND_URL="https://lms-backend.africanainetwork.com"
ARG NEXT_PUBLIC_API_URL="https://lms-backend.africanainetwork.com/api/v1/"
ARG NEXT_PUBLIC_LEARNHOUSE_DOMAIN="lms.africanainetwork.com"
ARG NEXT_PUBLIC_LEARNHOUSE_TOP_DOMAIN="africanainetwork.com"
ARG NEXT_PUBLIC_LEARNHOUSE_HTTPS="true"
ARG NEXT_PUBLIC_LEARNHOUSE_MULTI_ORG="false"
ARG NEXT_PUBLIC_LEARNHOUSE_DEFAULT_ORG="default"
ARG NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY=""

ENV NEXT_PUBLIC_LEARNHOUSE_API_URL=$NEXT_PUBLIC_LEARNHOUSE_API_URL
ENV NEXT_PUBLIC_LEARNHOUSE_BACKEND_URL=$NEXT_PUBLIC_LEARNHOUSE_BACKEND_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_LEARNHOUSE_DOMAIN=$NEXT_PUBLIC_LEARNHOUSE_DOMAIN
ENV NEXT_PUBLIC_LEARNHOUSE_TOP_DOMAIN=$NEXT_PUBLIC_LEARNHOUSE_TOP_DOMAIN
ENV NEXT_PUBLIC_LEARNHOUSE_HTTPS=$NEXT_PUBLIC_LEARNHOUSE_HTTPS
ENV NEXT_PUBLIC_LEARNHOUSE_MULTI_ORG=$NEXT_PUBLIC_LEARNHOUSE_MULTI_ORG
ENV NEXT_PUBLIC_LEARNHOUSE_DEFAULT_ORG=$NEXT_PUBLIC_LEARNHOUSE_DEFAULT_ORG
ENV NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY=$NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY

# Build Next.js standalone application with BuildKit cache
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    --mount=type=cache,id=next-cache,target=/app/.next/cache \
    pnpm run build

# Production runner image (Next.js standalone mode)
FROM base AS runner
WORKDIR /app

# Install curl for health checks
RUN apk update && apk add --no-cache curl && rm -rf /var/cache/apk/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENV NEXT_PUBLIC_LEARNHOUSE_API_URL="https://lms-backend.africanainetwork.com/api/v1/"
ENV NEXT_PUBLIC_LEARNHOUSE_BACKEND_URL="https://lms-backend.africanainetwork.com"
ENV NEXT_PUBLIC_API_URL="https://lms-backend.africanainetwork.com/api/v1/"
ENV NEXT_PUBLIC_LEARNHOUSE_DOMAIN="lms.africanainetwork.com"
ENV NEXT_PUBLIC_LEARNHOUSE_TOP_DOMAIN="africanainetwork.com"
ENV NEXT_PUBLIC_LEARNHOUSE_HTTPS="true"
ENV NEXT_PUBLIC_LEARNHOUSE_MULTI_ORG="false"
ENV NEXT_PUBLIC_LEARNHOUSE_DEFAULT_ORG="default"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy static assets and standalone bundle
COPY --from=builder /app/public ./public
RUN mkdir .next && chown nextjs:nodejs .next
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Server wrapper for runtime environment variable injection
COPY --chown=nextjs:nodejs server-wrapper.js ./
RUN chmod +x server-wrapper.js

# Entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Runtime config placeholder
RUN touch runtime-config.json && chown nextjs:nodejs runtime-config.json

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/api/health || curl -f http://localhost:${PORT:-3000}/ || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
