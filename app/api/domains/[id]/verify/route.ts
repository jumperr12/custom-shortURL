import { NextResponse } from "next/server";
import { resolveTxt } from "node:dns/promises";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { redis, k } from "@/lib/redis";

// the user adds a TXT record `_shorturl-verify.<hostname>` = <token>
// we resolve it and flip `verified` if it matches.
const RECORD_PREFIX = "_shorturl-verify";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let uid: string;
  try { uid = await requireUserId(); } catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }
  const { id } = await params;

  const d = await db.domain.findFirst({
    where: { id, userId: uid },
    select: { id: true, hostname: true, verificationToken: true, verified: true },
  });
  if (!d) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (d.verified) return NextResponse.json({ verified: true });

  let records: string[][];
  try {
    records = await resolveTxt(`${RECORD_PREFIX}.${d.hostname}`);
  } catch (e: any) {
    return NextResponse.json({ verified: false, error: `dns lookup failed: ${e.code ?? e.message}` }, { status: 200 });
  }

  // TXT records come back as arrays of strings (chunks). join before comparing.
  const found = records.some((chunks) => chunks.join("") === d.verificationToken);
  if (!found) {
    return NextResponse.json({
      verified: false,
      error: "token not found in dns",
      expected: `TXT ${RECORD_PREFIX}.${d.hostname} = ${d.verificationToken}`,
    });
  }

  await db.domain.update({ where: { id: d.id }, data: { verified: true } });
  // drop the negative cache so the next redirect picks up the new domain immediately
  await redis.del(k.domain(d.hostname));
  return NextResponse.json({ verified: true });
}
