import { db } from "./db";
import { redis, k } from "./redis";

export type CachedLink = {
  id: string;
  targetUrl: string;
  expiresAt: string | null;
  hasPassword: boolean;
  isActive: boolean;
};

const TTL_SECONDS = 60 * 60; // 1h — short enough that edits propagate fast, long enough to matter

// resolves a (domain, slug) → link. redis first, then postgres + populate cache.
// returns null if no such link exists (we cache that too, short ttl, to absorb bots
// hitting random slugs).
export async function resolveLink(domainId: string | null, slug: string): Promise<CachedLink | null> {
  const key = k.link(domainId, slug);
  const cached = await redis.get(key);
  if (cached !== null) {
    if (cached === "0") return null; // negative cache marker
    try { return JSON.parse(cached) as CachedLink; } catch { /* fall through */ }
  }

  const row = await db.link.findUnique({
    where: { domainId_slug: { domainId: domainId ?? "", slug } },
    select: {
      id: true, targetUrl: true, expiresAt: true,
      passwordHash: true, isActive: true,
    },
  });

  if (!row) {
    await redis.set(key, "0", "EX", 60);
    return null;
  }

  const payload: CachedLink = {
    id: row.id,
    targetUrl: row.targetUrl,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    hasPassword: !!row.passwordHash,
    isActive: row.isActive,
  };
  await redis.set(key, JSON.stringify(payload), "EX", TTL_SECONDS);
  return payload;
}

// drop the cached entry — call after link create/update/delete
export async function invalidateLink(domainId: string | null, slug: string) {
  await redis.del(k.link(domainId, slug));
}
