import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { exportLinkClicksCsv } from "@/lib/analytics";

// streams a csv of every click for the link. cursor-paginates internally so
// memory stays flat regardless of how many rows exist.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let uid: string;
  try { uid = await requireUserId(); } catch { return new Response("unauthorized", { status: 401 }); }
  const { id } = await params;

  const owned = await db.link.findFirst({ where: { id, userId: uid }, select: { id: true, slug: true } });
  if (!owned) return new Response("not found", { status: 404 });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        for await (const chunk of exportLinkClicksCsv(id)) controller.enqueue(enc.encode(chunk));
      } catch (e) { controller.error(e); return; }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${owned.slug}-clicks.csv"`,
    },
  });
}
