# Build tooling is required to compile native modules (e.g. better-sqlite3).
# It is installed in the build stages only, never in the final runtime image.
FROM node:lts-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# ------------------------------------------------------------------------------
# Stage 1: Install all dependencies (including dev deps required to build)
# ------------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ------------------------------------------------------------------------------
# Stage 2: Build the application (compiles TS + Vite assets into ./build)
# ------------------------------------------------------------------------------
FROM deps AS build
WORKDIR /app
COPY . .
RUN node ace build

# ------------------------------------------------------------------------------
# Stage 3: Install production dependencies only (compiled native modules)
# ------------------------------------------------------------------------------
FROM base AS production-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ------------------------------------------------------------------------------
# Stage 4: Production runtime (clean image: no source, no dev deps, no toolchain)
# ------------------------------------------------------------------------------
FROM node:lts-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/build ./
COPY --from=production-deps /app/node_modules ./node_modules

EXPOSE 3333
CMD ["node", "bin/server.js"]
