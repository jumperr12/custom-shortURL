"use client";

import { SessionProvider } from "next-auth/react";

// client-only wrapper so we don't ship NextAuth's session context to the redirect route.
// keep it tiny — anything heavier (theme, toast) goes in here too.
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
