import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";

const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
const body = z.object({
  hostname: z.string().refine((h) => HOSTNAME_RE.test(h), "invalid hostname"),
});

export async function GET() {
  let uid: string;
  try { uid = await requireUserId(); } catch { return unauth(); }

  const domains = await db.domain.findMany({
    where: { userId: uid },
    orderBy: { createdAt: "desc" },
    select: { id: true, hostname: true, verified: true, verificationToken: true, createdAt: true },
  });
  return NextResponse.json({ domains });
}

export async function POST(req: Request) {
  let uid: string;
  try { uid = await requireUserId(); } catch { return unauth(); }

  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid hostname" }, { status: 400 });

  const hostname = parsed.data.hostname.toLowerCase();
  // 32 hex chars in a TXT record is fine; resolvers handle it without splitting
  const verificationToken = randomBytes(16).toString("hex");

  try {
    const d = await db.domain.create({
      data: { hostname, userId: uid, verificationToken },
      select: { id: true, hostname: true, verificationToken: true, verified: true },
    });
    return NextResponse.json({ domain: d }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "domain already claimed" }, { status: 409 });
    throw e;
  }
}

const unauth = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });
