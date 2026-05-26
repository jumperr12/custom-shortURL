import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { getLinkStats, type Range } from "@/lib/analytics";

const VALID: Range[] = ["24h", "7d", "30d", "90d"];

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let uid: string;
  try { uid = await requireUserId(); } catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }
  const { id } = await params;

  // ownership check happens first; otherwise stats would leak between users
  const owned = await db.link.findFirst({ where: { id, userId: uid }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "not found" }, { status: 404 });

  const rangeParam = new URL(req.url).searchParams.get("range") ?? "7d";
  const range = (VALID as string[]).includes(rangeParam) ? (rangeParam as Range) : "7d";

  const stats = await getLinkStats(id, range);
  return NextResponse.json(stats);
}
