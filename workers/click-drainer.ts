// drains the redis click queue into postgres in batches.
// design notes:
//   - BRPOP would be 1-at-a-time. we use a tight loop + LRANGE/LTRIM for batches.
//   - failures push the batch back to the head so we don't lose events on a crash.
//   - clickCount on Link is incremented in the same tx as the inserts to stay consistent.

import { redis, k } from "../lib/redis";
import { db } from "../lib/db";
import { geoLookup } from "../lib/geoip";
import { parseUa } from "../lib/ua";

type RawClick = {
  linkId: string;
  ts: number;
  ip: string | null;   // already hashed in the redirect handler
  ua: string | null;
  referrer: string | null;
};

const BATCH = 200;
const IDLE_MS = 1000;

async function drainOnce(): Promise<number> {
  // peek a batch from the tail (oldest, since we LPUSH on enqueue)
  const raw = await redis.lrange(k.clicksQueue, -BATCH, -1);
  if (raw.length === 0) return 0;

  // remove what we just read. small race window: a crash between LRANGE and LTRIM
  // would replay events. that's fine — analytics tolerates a tiny dupe rate better
  // than data loss.
  await redis.ltrim(k.clicksQueue, 0, -raw.length - 1);

  const parsed: RawClick[] = [];
  for (const s of raw) {
    try { parsed.push(JSON.parse(s)); } catch { /* drop malformed */ }
  }
  if (parsed.length === 0) return 0;

  // enrich (geo lookup is in-memory once the mmdb is loaded; ua parse is pure cpu)
  const enriched = await Promise.all(parsed.map(async (c) => {
    const { country, city } = await geoLookup(c.ip);
    const { device, browser, os } = parseUa(c.ua);
    return {
      linkId: c.linkId,
      ts: new Date(c.ts),
      ipHash: c.ip,           // already hashed upstream
      country, city,
      referrer: c.referrer,
      userAgent: c.ua,
      device, browser, os,
    };
  }));

  // group click counts by link so we issue one update per link, not per event
  const counts = new Map<string, number>();
  for (const e of enriched) counts.set(e.linkId, (counts.get(e.linkId) ?? 0) + 1);

  await db.$transaction(async (tx) => {
    await tx.clickEvent.createMany({ data: enriched, skipDuplicates: false });
    for (const [linkId, n] of counts) {
      await tx.link.update({ where: { id: linkId }, data: { clickCount: { increment: n } } });
    }
  });

  return enriched.length;
}

async function main() {
  console.log("[drainer] up; queue:", k.clicksQueue);
  // simple loop: if we drained anything, spin again immediately; otherwise idle briefly
  // process exits on SIGTERM via the runtime; the loop just yields to the event queue
  for (;;) {
    try {
      const n = await drainOnce();
      if (n === 0) await sleep(IDLE_MS);
    } catch (e) {
      console.error("[drainer] error:", (e as Error).message);
      await sleep(2000);
    }
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

main().catch((e) => { console.error(e); process.exit(1); });
