import { NextResponse, type NextRequest } from "next/server";
import { resolveLink } from "@/lib/links";
import { resolveDomain, clientIp } from "@/lib/domain";
import { enqueueClick, hashIp } from "@/lib/clicks";

export const runtime = "nodejs";        // we need node apis (crypto, ioredis)
export const dynamic = "force-dynamic"; // never cache the redirect itself

// the hot path. order of operations is deliberate:
//   1. resolve domain + link (both redis-first)
//   2. cheap policy checks (active, expired, password)
//   3. fire the click event into redis without awaiting
//   4. 302 to target
// keep this function allocation-light — it runs on every click.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const domain = await resolveDomain(req.headers.get("host"));
  const link = await resolveLink(domain?.id ?? null, slug);
  if (!link || !link.isActive) return notFound();

  if (link.expiresAt && Date.parse(link.expiresAt) < Date.now()) {
    return expired();
  }

  if (link.hasPassword) {
    // gate page handles the actual password check + sets a cookie; we just bounce there
    const url = new URL(`/p/${encodeURIComponent(slug)}`, req.url);
    return NextResponse.redirect(url, 307);
  }

  // pass the request through to the queue; worker enriches with geo + ua later
  enqueueClick({
    linkId: link.id,
    ts: Date.now(),
    ip: hashIp(clientIp(req.headers)),
    ua: req.headers.get("user-agent"),
    referrer: req.headers.get("referer"),
  });

  // 302 (not 301) — 301 is permanent-cached by browsers, edits would be invisible
  return NextResponse.redirect(link.targetUrl, 302);
}

function notFound() {
  return new NextResponse("not found", { status: 404 });
}
function expired() {
  return new NextResponse("link expired", { status: 410 });
}
