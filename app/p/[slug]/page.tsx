import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { resolveDomain } from "@/lib/domain";

// password gate. the slug redirect kicks here when a link has passwordHash set.
// on success we set a short-lived cookie keyed to the link id so refreshes don't
// re-prompt; cookie isn't a security boundary (link owner can revoke), just UX.

const UNLOCK_TTL_S = 60 * 30; // 30min

export default async function GatePage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ err?: string }>;
}) {
  const { slug } = await params;
  const { err } = await searchParams;

  const h = await headers();
  const domain = await resolveDomain(h.get("host"));
  const link = await db.link.findFirst({
    where: { domainId: domain?.id ?? null, slug },
    select: { id: true, passwordHash: true, isActive: true, expiresAt: true, targetUrl: true },
  });
  if (!link || !link.isActive) return <p className="p-8">not found</p>;
  if (!link.passwordHash) redirect(`/${slug}`); // no password, send back to redirect handler

  // already unlocked?
  const c = await cookies();
  if (c.get(`unlocked:${link.id}`)?.value === "1") redirect(link.targetUrl);

  async function submit(formData: FormData) {
    "use server";
    const pw = String(formData.get("password") ?? "");
    if (!link || !link.passwordHash) return; // narrow for ts
    const ok = await bcrypt.compare(pw, link.passwordHash);
    if (!ok) redirect(`/p/${slug}?err=1`);

    (await cookies()).set(`unlocked:${link.id}`, "1", {
      httpOnly: true, sameSite: "lax", path: "/", maxAge: UNLOCK_TTL_S,
    });
    redirect(link.targetUrl);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold tracking-tight">protected link</h1>
      <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
        enter the password to continue.
      </p>
      <form action={submit} className="flex flex-col gap-3">
        <input name="password" type="password" required autoFocus
          className="rounded-md border px-3 py-2 bg-transparent" />
        {err && <p className="text-sm text-red-600">wrong password</p>}
        <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          unlock
        </button>
      </form>
    </main>
  );
}
