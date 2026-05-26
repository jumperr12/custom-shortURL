import { redis, k } from "./redis";
import { createHash } from "node:crypto";

export type RawClick = {
  linkId: string;
  ts: number;       // epoch ms
  ip: string | null;
  ua: string | null;
  referrer: string | null;
};

// salt rotates daily so ipHash is stable within a day (for unique-visitor counts)
// but not across days (privacy). secret pulled from AUTH_SECRET to avoid yet another env var.
function dailySalt(date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  return `${day}:${process.env.AUTH_SECRET ?? "dev"}`;
}

export function hashIp(ip: string | null, when = new Date()) {
  if (!ip) return null;
  return createHash("sha256").update(ip + "|" + dailySalt(when)).digest("hex").slice(0, 32);
}

// fire-and-forget: never blocks the redirect. errors are swallowed; the queue
// itself is the source of truth and a worker drains it into postgres.
export function enqueueClick(c: RawClick) {
  // not awaited on purpose
  redis.lpush(k.clicksQueue, JSON.stringify(c)).catch(() => { /* swallow */ });
}
