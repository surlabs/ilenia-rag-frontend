# 1️⃣ Pruner
FROM node:20-slim AS pruner
WORKDIR /app
RUN corepack enable
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=server --docker

# 2️⃣ Builder
FROM node:20-slim AS builder
WORKDIR /app
RUN corepack enable

COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
COPY --from=pruner /app/out/full/ ./

COPY .env apps/server/.env

RUN npm ci

# Server build
RUN npx turbo build --filter=server

RUN echo "=== Node modules ===" && ls -la node_modules | head -n 20

# 3️⃣ Runner
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app ./

WORKDIR /app/apps/server

EXPOSE 3000

CMD ["npm", "run", "start"]
