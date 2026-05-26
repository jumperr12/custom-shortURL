import Link from "next/link";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic"; // dashboard always reflects fresh state

export default async function DashboardHome() {
  const uid = await requireUserId();

  const links = await db.link.findMany({
    where: { userId: uid },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, slug: true, targetUrl: true, title: true, isActive: true,
      expiresAt: true, clickCount: true, createdAt: true,
      domain: { select: { hostname: true } },
    },
    take: 100,
  });

  const appHost = new URL(env().APP_URL).host;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">your links</h1>
          <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            {links.length} active
          </p>
        </div>
        <Link href="/dashboard/links/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          new link
        </Link>
      </div>

      {links.length === 0 ? (
        <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
          no links yet. create your first one.
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">short</th>
                <th className="px-3 py-2 font-medium">target</th>
                <th className="px-3 py-2 font-medium">clicks</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => {
                const host = l.domain?.hostname ?? appHost;
                const shortUrl = `https://${host}/${l.slug}`;
                const expired = l.expiresAt ? l.expiresAt.getTime() < Date.now() : false;
                return (
                  <tr key={l.id} className="border-t">
                    <td className="px-3 py-2 font-mono">
                      <a href={shortUrl} target="_blank" rel="noreferrer" className="hover:underline">
                        {host}/{l.slug}
                      </a>
                      {expired && <span className="ml-2 text-xs text-red-600">expired</span>}
                      {!l.isActive && <span className="ml-2 text-xs text-yellow-600">paused</span>}
                    </td>
                    <td className="px-3 py-2 max-w-xs truncate" title={l.targetUrl}>
                      {l.targetUrl}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{l.clickCount}</td>
                    <td className="px-3 py-2 text-right">
                      <Link href={`/dashboard/links/${l.id}`} className="hover:underline">stats →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
