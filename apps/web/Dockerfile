# 1️⃣ Pruner
FROM node:20-slim AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=web --docker

# 2️⃣ Builder
FROM node:20-slim AS builder
WORKDIR /app

COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
COPY --from=pruner /app/out/full/ ./
COPY .env apps/web/.env

RUN npm ci
RUN npx turbo build --filter=web

RUN echo "=== Next.js location ===" && \
    find /app -path "*/node_modules/next/package.json" 2>/dev/null

# 3️⃣ Runner
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app ./

WORKDIR /app/apps/web

EXPOSE 3001

CMD ["npm", "run", "start"]