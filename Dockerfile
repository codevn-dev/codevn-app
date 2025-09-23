# Use the official Node.js 20 Alpine image as base
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable pnpm && pnpm run build

# Production image, copy all the files and run next
FROM base AS web

RUN apk add --no-cache curl

WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public folder
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Ensure the uploads directory exists and has proper permissions
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads

# Copy the complete .next directory for server chunks
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

# Copy node_modules for Next.js dependencies that standalone mode needs
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy package.json for npm start
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "start"]

########################################
# API image (Fastify)
########################################
FROM deps AS api
WORKDIR /app

# Copy source code
COPY . .

# Create uploads directory and set permissions
RUN mkdir -p /app/public/uploads && chmod 755 /app/public/uploads

# Expose API port
EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

# Start Fastify API server
CMD ["pnpm", "dev:api"]

########################################
# Migrator image
########################################
FROM deps AS migrator
WORKDIR /app

# node_modules already installed in deps stage, drizzle-kit included
# Copy drizzle config and schema
COPY drizzle.config.ts ./drizzle.config.ts
COPY src/lib/database/schema.ts ./src/lib/database/schema.ts

# Default command for this image
CMD ["pnpm", "db:push"]
