FROM node:lts-bookworm-slim AS base

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
# Stage 3: Production runtime (only production deps + standalone build output)
# ------------------------------------------------------------------------------
FROM base AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/build ./
RUN npm ci --omit=dev

EXPOSE 3333
CMD ["node", "bin/server.js"]
