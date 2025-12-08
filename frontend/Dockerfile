FROM node:18-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Enable pnpm
RUN corepack enable

# Explicitly copy configuration files from frontend directory (since context is root)
COPY frontend/package.json frontend/pnpm-workspace.yaml frontend/pnpm-lock.yaml ./
COPY frontend/apps/web/package.json ./apps/web/package.json
COPY frontend/packages/ ./packages/

# Copy all other source files from frontend
COPY frontend/ ./

# Install dependencies (using pnpm now that structure is correct)
RUN pnpm install --frozen-lockfile

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the web app
WORKDIR /app/apps/web
# Using npx next build to avoid filter issues
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
