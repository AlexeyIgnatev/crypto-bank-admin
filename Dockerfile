# Stage 1: deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# Stage 2: builder
FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Disable telemetry and ensure Next can build in CI
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Allow overriding API base at runtime (optional)
ENV API_BASE="http://backend:8080"
# Create non-root user
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Copy only necessary files
# Use Next.js standalone output (requires next.config.ts: output = "standalone")
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./
# Fallback: also copy server files for next start
COPY --from=builder /app/.next/server ./.next/server
COPY --from=builder /app/next.config.ts ./next.config.ts

USER nextjs
EXPOSE 3000
# Bind to all interfaces
ENV HOST=0.0.0.0
# Prefer standalone server if emitted, else use next start
CMD ["sh", "-c", "if [ -f server.js ]; then node server.js; else npx next start -H 0.0.0.0 -p 3000; fi"]
