# # Multi-stage build: the final image never contains the Prisma CLI, dev
# # dependencies, or build tooling -- only what's needed to run the server.
# # This keeps the production image small and reduces attack surface (fewer
# # packages = fewer CVEs to track).

# FROM node:20-alpine AS base
# WORKDIR /app

# # ── Stage 1: install ALL dependencies (including dev, for the Prisma CLI) ──
# FROM base AS deps
# COPY package.json package-lock.json* ./
# RUN npm ci

# # ── Stage 2: generate the Prisma client and verify the app boots ──────────
# FROM base AS builder
# COPY --from=deps /app/node_modules ./node_modules
# COPY . .
# # This is the exact step that needs network access to Prisma's engine
# # binaries -- fine here, since a real Docker build (your machine, CI, or
# # EC2) has normal internet access, unlike the sandbox this project was
# # developed in, which had that specific host blocked.
# RUN npx prisma generate --schema=prisma/schema.prisma

# # ── Stage 3: production image, prod deps only ──────────────────────────────
# FROM base AS production
# ENV NODE_ENV=production

# COPY package.json package-lock.json* ./
# RUN npm ci --omit=dev

# # Copy ONLY the generated Prisma client output from the builder stage,
# # not the whole builder node_modules -- avoids dragging dev dependencies
# # (the Prisma CLI itself, ~150MB) into the final image.
# COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
# COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# COPY src ./src
# COPY prisma ./prisma
# COPY scripts ./scripts

# # Runs as the built-in non-root `node` user, not root -- standard container
# # hardening, costs nothing to do correctly from the start.
# USER node

# EXPOSE 4000
# CMD ["node", "src/server.js"]



# Multi-stage build: the final image never contains the Prisma CLI, dev
# dependencies, or build tooling -- only what's needed to run the server.
# This keeps the production image small and reduces attack surface (fewer
# packages = fewer CVEs to track).
#
# Base image is Debian-slim, NOT Alpine -- found via a real production
# crash: Prisma's musl-linked query engine needs libssl.so.1.1, which
# newer Alpine base images no longer ship (they moved to OpenSSL 3.x by
# default). This isn't a one-off Alpine version quirk to patch around --
# Prisma's own docs recommend Debian-slim specifically because this class
# of musl/OpenSSL mismatch has recurred across multiple Alpine releases.
# Slightly larger image, genuinely fewer surprises.

FROM node:20-slim AS base
WORKDIR /app
# openssl explicitly installed -- Debian slim images don't always include
# it by default, and Prisma's engine binary needs it at runtime.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

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
# hardening, costs nothing to do correctly from the start. node:20-slim
# ships this user by default too, same as the alpine image did.
USER node

EXPOSE 4000
CMD ["node", "src/server.js"]