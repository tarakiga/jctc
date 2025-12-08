FROM node:18-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy all source files
COPY . .

# Debug: List files to ensure package.json exists
RUN ls -la

# Install dependencies with npm (bypass pnpm issues)
RUN npm install --legacy-peer-deps

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build (using standard next build)
WORKDIR /app/apps/web
RUN npx next build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
