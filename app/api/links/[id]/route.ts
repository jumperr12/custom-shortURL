import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { invalidateLink } from "@/lib/links";
import bcrypt from "bcryptjs";

const patchBody = z.object({
  targetUrl: z.string().url().max(2048).optional(),
  title: z.string().max(200).nullable().optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  password: z.string().min(4).max(200).nullable().optional(), // null = remove
});

async function loadOwned(id: string, userId: string) {
  return db.link.findFirst({
    where: { id, userId },
    select: { id: true, slug: true, domainId: true },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let uid: string;
  try { uid = await requireUserId(); } catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }
  const { id } = await params;

  const owned = await loadOwned(id, uid);
  if (!owned) return NextResponse.json({ error: "not found" }, { status: 404 });

  const parsed = patchBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const b = parsed.data;

  const data: Record<string, unknown> = { ...b };
  if (b.password === null) data.passwordHash = null;
  else if (typeof b.password === "string") data.passwordHash = await bcrypt.hash(b.password, 10);
  delete data.password;

  if (typeof b.expiresAt === "string") data.expiresAt = new Date(b.expiresAt);

  await db.link.update({ where: { id }, data });
  await invalidateLink(owned.domainId, owned.slug);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let uid: string;
  try { uid = await requireUserId(); } catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }
  const { id } = await params;

  const owned = await loadOwned(id, uid);
  if (!owned) return NextResponse.json({ error: "not found" }, { status: 404 });

  await db.link.delete({ where: { id } });
  await invalidateLink(owned.domainId, owned.slug);
  return NextResponse.json({ ok: true });
}
