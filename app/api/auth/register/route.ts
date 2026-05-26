import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

const body = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid email or password" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();

  // cheap pre-check; the unique constraint below is the real guard against races
  const exists = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) return NextResponse.json({ error: "email already in use" }, { status: 409 });

  // cost 10 ≈ ~100ms on modern hw. raise for prod if you can afford it.
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  try {
    await db.user.create({ data: { email, passwordHash } });
  } catch {
    // unique violation (race) — treat same as the pre-check
    return NextResponse.json({ error: "email already in use" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
