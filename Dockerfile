# Production image for devya-tasks-app (tasks.devya-solutions.com), run on the Devya VPS behind
# nginx. The app left Vercel after the 2026-11-13 account pause; see the README
# "Hosting" section and scripts/deploy.sh. Next.js standalone output: the
# runner holds server.js and the traced node_modules only.
FROM node:24.22.1-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:24.22.1-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* are inlined into the browser bundle and the /api rewrite target
# is baked into the routes manifest, so config comes in at build time too
# (values in docker-compose.prod.yml).
ARG API_PROXY_TARGET
ARG SESSION_COOKIE_NAME
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ADMIN_URL
ARG NEXT_PUBLIC_BOOKING_URL
ENV API_PROXY_TARGET=$API_PROXY_TARGET \
    SESSION_COOKIE_NAME=$SESSION_COOKIE_NAME \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_ADMIN_URL=$NEXT_PUBLIC_ADMIN_URL \
    NEXT_PUBLIC_BOOKING_URL=$NEXT_PUBLIC_BOOKING_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npx next build

FROM node:24.22.1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
