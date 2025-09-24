# Use the official Node.js 22 Alpine image as base
FROM public.ecr.aws/docker/library/node:22-alpine AS base

# Create app user and group
RUN addgroup --system --gid 1001 codevn \
    && adduser --system --uid 1001 --ingroup codevn codevn

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable pnpm && pnpm run build

# Production image using standalone mode
FROM base AS web
RUN apk add --no-cache curl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy standalone output
COPY --from=builder --chown=codevn:codevn /app/.next/standalone ./
COPY --from=builder --chown=codevn:codevn /app/.next/static ./.next/static
COPY --from=builder --chown=codevn:codevn /app/public ./public

# Ensure the uploads directory exists and has proper permissions
RUN mkdir -p /app/public/uploads && chown -R codevn:codevn /app/public/uploads

USER codevn

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]

########################################
# API image (Fastify)
########################################
FROM deps AS api
WORKDIR /app

COPY . .

RUN mkdir -p /app/public/uploads && chown -R codevn:codevn /app/public/uploads

USER codevn

EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001

CMD ["pnpm", "dev:api"]

########################################
# Migrator image
########################################
FROM deps AS migrator
WORKDIR /app

# node_modules already installed in deps stage, drizzle-kit included
# Copy drizzle config and schema
COPY drizzle.config.ts ./drizzle.config.ts
COPY src/server/database/schema.ts ./src/server/database/schema.ts

# Default command for this image
CMD ["pnpm", "db:push"]
