import { db } from "./db";
import { redis, k } from "./redis";

export type CachedDomain = { id: string; userId: string; verified: boolean } | null;

// returns null when the host is the app's own (no custom domain match).
// we always cache, including misses, so bots probing random hosts don't hit pg.
export async function resolveDomain(host: string | null): Promise<CachedDomain> {
  if (!host) return null;
  const h = host.toLowerCase().split(":")[0]; // strip port
  const appHost = new URL(process.env.APP_URL ?? "http://localhost:3000").hostname;
  if (h === appHost || h === "localhost") return null;

  const key = k.domain(h);
  const cached = await redis.get(key);
  if (cached === "0") return null;
  if (cached) {
    try { return JSON.parse(cached) as CachedDomain; } catch { /* refetch */ }
  }

  const row = await db.domain.findUnique({
    where: { hostname: h },
    select: { id: true, userId: true, verified: true },
  });

  if (!row) {
    await redis.set(key, "0", "EX", 300);
    return null;
  }
  await redis.set(key, JSON.stringify(row), "EX", 3600);
  return row;
}

// strip the proxy chain and pull the originating client ip.
// trusts x-forwarded-for; if you sit behind an untrusted proxy, change this.
export function clientIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip");
}
