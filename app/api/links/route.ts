import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { newSlug, isValidAlias } from "@/lib/slug";
import { invalidateLink } from "@/lib/links";
import bcrypt from "bcryptjs";

const createBody = z.object({
  targetUrl: z.string().url().max(2048),
  alias: z.string().optional(),
  domainId: z.string().optional().nullable(),
  title: z.string().max(200).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  password: z.string().min(4).max(200).optional().nullable(),
});

export async function GET() {
  let uid: string;
  try { uid = await requireUserId(); } catch { return unauth(); }

  // light projection — list views don't need targetUrl trimmed differently or hashes
  const links = await db.link.findMany({
    where: { userId: uid },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, slug: true, targetUrl: true, title: true, isActive: true,
      expiresAt: true, clickCount: true, createdAt: true,
      domain: { select: { hostname: true } },
    },
    take: 200,
  });
  return NextResponse.json({ links });
}

export async function POST(req: Request) {
  let uid: string;
  try { uid = await requireUserId(); } catch { return unauth(); }

  const parsed = createBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const b = parsed.data;

  // custom alias must be valid AND owned-by-or-shared logic happens at the unique constraint
  let slug: string;
  if (b.alias) {
    if (!isValidAlias(b.alias)) return NextResponse.json({ error: "alias has invalid characters" }, { status: 400 });
    slug = b.alias;
  } else {
    slug = newSlug();
  }

  // if a domain id is passed, verify it belongs to this user — defensive vs id-guessing
  if (b.domainId) {
    const d = await db.domain.findFirst({ where: { id: b.domainId, userId: uid }, select: { id: true } });
    if (!d) return NextResponse.json({ error: "domain not found" }, { status: 400 });
  }

  const passwordHash = b.password ? await bcrypt.hash(b.password, 10) : null;

  try {
    const link = await db.link.create({
      data: {
        slug,
        domainId: b.domainId ?? null,
        targetUrl: b.targetUrl,
        title: b.title,
        userId: uid,
        expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
        passwordHash,
      },
      select: { id: true, slug: true, domainId: true },
    });
    // user-provided alias shouldn't be in cache yet, but cheap to clear in case
    await invalidateLink(link.domainId, link.slug);
    return NextResponse.json({ link }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "alias already in use" }, { status: 409 });
    }
    throw e;
  }
}

const unauth = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });
