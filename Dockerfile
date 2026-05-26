# multi-stage: build once, ship a slim runtime image
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat openssl tini \
 && addgroup -S app && adduser -S app -G app

# next standalone output already trims node_modules to runtime deps
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/prisma ./prisma
COPY --from=build --chown=app:app /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=app:app /app/node_modules/@prisma ./node_modules/@prisma
# worker entrypoint + its tsx loader live outside standalone, copy them in
COPY --from=build --chown=app:app /app/workers ./workers
COPY --from=build --chown=app:app /app/lib ./lib
COPY --from=build --chown=app:app /app/node_modules/tsx ./node_modules/tsx
COPY --from=build --chown=app:app /app/node_modules/.bin/tsx ./node_modules/.bin/tsx

USER app
EXPOSE 3000
ENTRYPOINT ["/sbin/tini","--"]
CMD ["node","server.js"]
