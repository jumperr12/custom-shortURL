import Redis from "ioredis";

// lazy singleton — connecting at import time breaks `next build` (no redis in the
// build container) and any other tool that loads modules without a running stack.
// the client is created on first call to redis() / k().
const g = globalThis as unknown as { __redis?: Redis };

function client(): Redis {
  if (g.__redis) return g.__redis;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL not set");
  const c = new Redis(url, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: false,
  });
  if (process.env.NODE_ENV !== "production") g.__redis = c;
  else g.__redis = c;
  return c;
}

// proxy so existing `redis.get(...)` call sites keep working without rewrites.
// every property access forwards to the underlying client, created on first touch.
export const redis: Redis = new Proxy({} as Redis, {
  get(_t, prop) {
    const c = client() as unknown as Record<PropertyKey, unknown>;
    const v = c[prop];
    return typeof v === "function" ? (v as Function).bind(c) : v;
  },
});

// cache key builders — pure functions, safe to call any time
export const k = {
  link: (domainId: string | null, slug: string) => `link:${domainId ?? "_"}:${slug}`,
  domain: (host: string) => `domain:${host.toLowerCase()}`,
  clicksQueue: "clicks:queue",
  stats: (linkId: string, range: string) => `stats:${linkId}:${range}`,
};
