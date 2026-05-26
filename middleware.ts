import { NextResponse, type NextRequest } from "next/server";

// reserved paths that must never be treated as short slugs
const RESERVED = new Set([
  "api", "_next", "favicon.ico", "robots.txt", "sitemap.xml",
  "login", "register", "dashboard", "public", "p",
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const first = pathname.split("/")[1] ?? "";

  // host-based routing for custom domains lives here once Domain model is in place.
  // for now we just guard reserved roots and let everything else fall through to /[slug]
  if (!first || RESERVED.has(first)) return NextResponse.next();
  return NextResponse.next();
}

export const config = {
  // skip static + image optimizer, run on everything else
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
