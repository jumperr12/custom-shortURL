import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { redis, k } from "@/lib/redis";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let uid: string;
  try { uid = await requireUserId(); } catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }
  const { id } = await params;

  const d = await db.domain.findFirst({ where: { id, userId: uid }, select: { id: true, hostname: true } });
  if (!d) return NextResponse.json({ error: "not found" }, { status: 404 });

  await db.domain.delete({ where: { id } });
  await redis.del(k.domain(d.hostname));
  return NextResponse.json({ ok: true });
}
