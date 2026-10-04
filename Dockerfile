# ============================================================================
# AI Brain Server Dockerfile
# Distributed Bilingual (Sinhala + English) AI Agent & Shared Memory Engine
# ============================================================================

FROM node:22-alpine AS builder

WORKDIR /app

# Copy brain-server dependencies
COPY brain-server/package*.json ./brain-server/
WORKDIR /app/brain-server
RUN npm ci

# Copy SDK & build
WORKDIR /app
COPY sdk/package*.json ./sdk/
WORKDIR /app/sdk
RUN npm ci
COPY sdk/ ./
RUN npm run build

# Copy brain-server source & build
WORKDIR /app/brain-server
COPY brain-server/ ./
RUN npm run build

# Production Runner
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Install Python and bash for code sandbox execution
RUN apk add --no-cache python3 bash

COPY --from=builder /app/brain-server/package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/brain-server/dist ./dist
COPY --from=builder /app/brain-server/public ./public
COPY --from=builder /app/brain-server/src/db/schema.sql ./src/db/schema.sql

EXPOSE 3000

CMD ["node", "dist/index.js"]
