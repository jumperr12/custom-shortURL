import { auth } from "@/auth";

// pulls the user id out of the session or throws. server-side only.
// route handlers should `try/catch` and return 401; rsc pages should redirect.
export async function requireUserId(): Promise<string> {
  const s = await auth();
  const uid = (s?.user as { id?: string } | undefined)?.id;
  if (!uid) throw new Error("unauthorized");
  return uid;
}

export async function getUserId(): Promise<string | null> {
  const s = await auth();
  return (s?.user as { id?: string } | undefined)?.id ?? null;
}
