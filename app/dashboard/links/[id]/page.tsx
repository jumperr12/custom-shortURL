import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { env } from "@/lib/env";
import { StatsView } from "@/components/stats-view";

export const dynamic = "force-dynamic";

export default async function LinkStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const uid = await requireUserId();
  const { id } = await params;

  const link = await db.link.findFirst({
    where: { id, userId: uid },
    select: {
      id: true, slug: true, targetUrl: true, title: true, isActive: true,
      expiresAt: true, clickCount: true, createdAt: true,
      domain: { select: { hostname: true } },
    },
  });
  if (!link) notFound();

  const e = env();
  const host = link.domain?.hostname ?? new URL(e.APP_URL).host;
  const shortUrl = `${e.APP_URL.startsWith("https") ? "https" : "http"}://${host}/${link.slug}`;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/dashboard" className="text-sm hover:underline"
                style={{ color: "rgb(var(--muted))" }}>← all links</Link>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">
            {link.title || link.slug}
          </h1>
          <a href={shortUrl} target="_blank" rel="noreferrer"
             className="font-mono text-sm hover:underline">
            {host}/{link.slug}
          </a>
          <p className="mt-1 truncate text-sm" style={{ color: "rgb(var(--muted))" }}>
            → {link.targetUrl}
          </p>
        </div>
      </div>

      <StatsView linkId={link.id} />
    </div>
  );
}
