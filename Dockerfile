# ── Build stage ──
FROM node:20-alpine AS builder

WORKDIR /app

# Prisma가 OpenSSL 버전을 감지해 올바른 엔진을 생성/로드하려면 openssl 라이브러리가 필요하다.
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Runtime stage ──
FROM node:20-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

# 런타임에서도 Prisma 쿼리 엔진이 OpenSSL 3 라이브러리를 필요로 한다.
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma

EXPOSE 4000

CMD ["node", "dist/server.js"]
