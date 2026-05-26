import { db } from "./db";
import { redis, k } from "./redis";
import { Prisma } from "@prisma/client";

export type Range = "24h" | "7d" | "30d" | "90d";

const RANGE_MS: Record<Range, number> = {
  "24h": 24 * 3600_000,
  "7d":  7  * 24 * 3600_000,
  "30d": 30 * 24 * 3600_000,
  "90d": 90 * 24 * 3600_000,
};

// hourly buckets for 24h, daily for everything else. keeps payloads small and charts readable.
function bucketUnit(range: Range): "hour" | "day" {
  return range === "24h" ? "hour" : "day";
}

export type TimeBucket = { t: string; clicks: number; uniques: number };
export type Breakdown = { key: string; count: number };
export type LinkStats = {
  range: Range;
  total: number;
  uniques: number;
  series: TimeBucket[];
  countries: Breakdown[];
  referrers: Breakdown[];
  devices: Breakdown[];
  browsers: Breakdown[];
};

// short cache — analytics views can tolerate a minute of staleness in exchange for
// dodging the heaviest queries under refresh-spam.
const CACHE_TTL = 60;

export async function getLinkStats(linkId: string, range: Range): Promise<LinkStats> {
  const cacheKey = k.stats(linkId, range);
  const cached = await redis.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached) as LinkStats; } catch { /* recompute */ }
  }

  const since = new Date(Date.now() - RANGE_MS[range]);
  const unit = bucketUnit(range);

  // raw sql for date_trunc — prisma's groupBy doesn't bucket time.
  // Prisma.sql with parameters keeps things injection-safe.
  const seriesRows = await db.$queryRaw<
    { t: Date; clicks: bigint; uniques: bigint }[]
  >(Prisma.sql`
    SELECT
      date_trunc(${unit}, "ts") AS t,
      count(*)                  AS clicks,
      count(DISTINCT "ipHash")  AS uniques
    FROM "ClickEvent"
    WHERE "linkId" = ${linkId} AND "ts" >= ${since}
    GROUP BY 1
    ORDER BY 1
  `);

  // run all breakdowns in parallel — they're independent
  const [countries, referrers, devices, browsers, totals] = await Promise.all([
    topBreakdown(linkId, since, "country"),
    topBreakdown(linkId, since, "referrer"),
    topBreakdown(linkId, since, "device"),
    topBreakdown(linkId, since, "browser"),
    db.$queryRaw<{ total: bigint; uniques: bigint }[]>(Prisma.sql`
      SELECT count(*)::bigint AS total, count(DISTINCT "ipHash")::bigint AS uniques
      FROM "ClickEvent"
      WHERE "linkId" = ${linkId} AND "ts" >= ${since}
    `),
  ]);

  const stats: LinkStats = {
    range,
    total: Number(totals[0]?.total ?? 0n),
    uniques: Number(totals[0]?.uniques ?? 0n),
    series: seriesRows.map((r) => ({
      t: r.t.toISOString(),
      clicks: Number(r.clicks),
      uniques: Number(r.uniques),
    })),
    countries, referrers, devices, browsers,
  };

  await redis.set(cacheKey, JSON.stringify(stats), "EX", CACHE_TTL);
  return stats;
}

async function topBreakdown(linkId: string, since: Date, col: "country" | "referrer" | "device" | "browser") {
  // column name is from a closed set above; safe to interpolate
  const rows = await db.$queryRaw<{ key: string | null; n: bigint }[]>(Prisma.sql`
    SELECT ${Prisma.raw(`"${col}"`)} AS key, count(*) AS n
    FROM "ClickEvent"
    WHERE "linkId" = ${linkId} AND "ts" >= ${since}
    GROUP BY 1
    ORDER BY n DESC
    LIMIT 10
  `);
  return rows.map((r) => ({ key: r.key ?? "(unknown)", count: Number(r.n) }));
}

// streaming-friendly csv. used by the export endpoint.
export async function* exportLinkClicksCsv(linkId: string) {
  yield "ts,country,city,device,browser,os,referrer\n";
  // cursor pagination keeps memory flat regardless of row count
  let cursor: string | undefined;
  for (;;) {
    const rows = await db.clickEvent.findMany({
      where: { linkId },
      orderBy: { id: "asc" },
      take: 1000,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      select: {
        id: true, ts: true, country: true, city: true,
        device: true, browser: true, os: true, referrer: true,
      },
    });
    if (rows.length === 0) break;
    for (const r of rows) {
      yield [
        r.ts.toISOString(),
        r.country ?? "",
        r.city ?? "",
        r.device ?? "",
        r.browser ?? "",
        r.os ?? "",
        csvEscape(r.referrer ?? ""),
      ].join(",") + "\n";
    }
    cursor = rows[rows.length - 1].id;
    if (rows.length < 1000) break;
  }
}

function csvEscape(s: string) {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
