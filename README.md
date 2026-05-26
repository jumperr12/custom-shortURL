# custom-shortURL

Self-hosted URL shortener — branded custom domains, custom aliases, expirable links, Redis-cached redirects, and a real analytics dashboard.

## Stack

- Next.js 15 (App Router, TypeScript)
- PostgreSQL + Prisma
- Redis (link cache + click queue)
- Auth.js v5 (email + password, JWT sessions)
- Recharts for the analytics charts
- MaxMind GeoLite2 for IP → country/city (optional)
- ua-parser-js for device/browser/os
- Docker Compose for everything

## Run it

```bash
cp .env.example .env
# edit .env — at minimum set AUTH_SECRET (openssl rand -base64 32)

docker compose up --build
# app: http://localhost:3000
```

The first boot runs `prisma migrate deploy` automatically. The `worker` service drains click events from Redis into Postgres in batches.

### Local dev (without Docker for the app)

```bash
docker compose up -d db redis
npm install
npx prisma migrate dev
npm run dev          # app
npm run worker       # in another shell
```

## Architecture

```
GET /:slug
  ├─ resolveDomain(host)     [redis → pg, both cached]
  ├─ resolveLink(domain,slug) [redis → pg, both cached]
  ├─ enqueueClick()          [LPUSH redis, not awaited]
  └─ 302 → targetUrl

workers/click-drainer
  └─ LRANGE/LTRIM batch → enrich (geo + ua) → INSERT clicks + UPDATE counters
```

### Why some choices

- **302, not 301.** 301 sticks in browser caches forever; edits would never propagate.
- **Negative caching** in `resolveLink`/`resolveDomain` (60s/300s TTL). Random bots hitting nonexistent slugs would otherwise hammer Postgres.
- **Fire-and-forget click enqueue.** Redirect latency dominates user experience; the queue is the source of truth, Postgres is downstream.
- **Daily-rotating IP salt.** Lets us count unique visitors within a day without storing PII.
- **`(domainId, slug)` is the routing key.** Means two users can each own `/launch` on different domains.

## Custom domains

1. Add the domain in `/dashboard/domains`.
2. Point an `A`/`CNAME` record at this server.
3. Add a `TXT` record at `_shorturl-verify.<your-host>` with the token shown.
4. Click "check dns".

## GeoIP

Optional. Download `GeoLite2-City.mmdb` from MaxMind and place it at `./data/GeoLite2-City.mmdb` (mounted read-only into both `app` and `worker` containers). Without it, country/city columns stay null but everything else works.

## Layout

```
app/
  (auth)/login, (auth)/register     auth pages
  dashboard/                        link list, new link, link stats, domains
  api/                              links, domains, auth, stats, export
  [slug]/route.ts                   the hot redirect path
  p/[slug]/page.tsx                 password gate
lib/                                db, redis, env, links, clicks, domain, geoip, ua, analytics
workers/click-drainer.ts            redis → postgres ingest
prisma/schema.prisma                User, Domain, Link, ClickEvent, ApiToken
```

## Next steps (not yet built)

- Rate limiting (Redis token bucket) on the redirect path
- API tokens (model is in the schema; UI + middleware not wired)
- QR code generation per link
- Bulk import / CSV upload of links
