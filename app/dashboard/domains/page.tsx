import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { DomainsClient } from "./domains-client";

export const dynamic = "force-dynamic";

export default async function DomainsPage() {
  const uid = await requireUserId();
  const domains = await db.domain.findMany({
    where: { userId: uid },
    orderBy: { createdAt: "desc" },
    select: { id: true, hostname: true, verified: true, verificationToken: true, createdAt: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">custom domains</h1>
        <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
          point a hostname at this server, then verify with a TXT record.
        </p>
      </div>
      <DomainsClient initial={domains.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
      }))} />
    </div>
  );
}
