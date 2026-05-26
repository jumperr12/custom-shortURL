# two stages: build with full deps, ship a runtime image with the same node_modules.
# we deliberately skip next's `output: "standalone"` — it trims node_modules to the
# app's imports only, which breaks the prisma CLI (for migrations) and the worker
# (which uses tsx). image is bigger; setup is much simpler.

FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat openssl tini \
 && addgroup -S app && adduser -S app -G app

# bring over the already-installed node_modules + the built app
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/.next ./.next
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/prisma ./prisma
COPY --from=build --chown=app:app /app/package.json /app/package-lock.json ./
COPY --from=build --chown=app:app /app/next.config.mjs ./
COPY --from=build --chown=app:app /app/lib ./lib
COPY --from=build --chown=app:app /app/workers ./workers
COPY --from=build --chown=app:app /app/auth.ts ./
COPY --from=build --chown=app:app /app/tsconfig.json ./

USER app
EXPOSE 3000
ENTRYPOINT ["/sbin/tini","--"]
# default cmd is the web app; compose overrides for the worker
CMD ["npx","next","start","-p","3000"]
