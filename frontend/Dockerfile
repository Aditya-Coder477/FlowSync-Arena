# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Copy lockfile + manifest together so npm ci can verify integrity
COPY package.json package-lock.json ./
# npm ci: clean install, respects lockfile exactly (production-safe)
RUN npm ci

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_API_URL is baked into the JS bundle at build time by Next.js.
# Pass it as a build argument: docker build --build-arg NEXT_PUBLIC_API_URL=https://...
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Ensure public/ exists even if the project has no static assets
RUN mkdir -p ./public

RUN npm run build

# ── Stage 3: Production runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# Cloud Run injects PORT; Next.js standalone server reads it automatically
ENV PORT=3000
# Required for Next.js standalone to bind on all interfaces in containers
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Create public dir if it doesn't exist (Next.js requires it)
RUN mkdir -p ./public

# Copy only the optimised standalone output (much smaller than full build)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Next.js standalone entry point
CMD ["node", "server.js"]
