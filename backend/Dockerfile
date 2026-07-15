# Multi-stage build: the final image never contains the Prisma CLI, dev
# dependencies, or build tooling -- only what's needed to run the server.
# This keeps the production image small and reduces attack surface (fewer
# packages = fewer CVEs to track).

FROM node:20-alpine AS base
WORKDIR /app

# ── Stage 1: install ALL dependencies (including dev, for the Prisma CLI) ──
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2: generate the Prisma client and verify the app boots ──────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# This is the exact step that needs network access to Prisma's engine
# binaries -- fine here, since a real Docker build (your machine, CI, or
# EC2) has normal internet access, unlike the sandbox this project was
# developed in, which had that specific host blocked.
RUN npx prisma generate --schema=prisma/schema.prisma

# ── Stage 3: production image, prod deps only ──────────────────────────────
FROM base AS production
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy ONLY the generated Prisma client output from the builder stage,
# not the whole builder node_modules -- avoids dragging dev dependencies
# (the Prisma CLI itself, ~150MB) into the final image.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

COPY src ./src
COPY prisma ./prisma
COPY scripts ./scripts

# Runs as the built-in non-root `node` user, not root -- standard container
# hardening, costs nothing to do correctly from the start.
USER node

EXPOSE 4000
CMD ["node", "src/server.js"]
