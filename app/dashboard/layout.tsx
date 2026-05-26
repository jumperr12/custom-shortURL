import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/session";
import { signOut } from "@/auth";

// any /dashboard/* page goes through this guard. cheap: just reads the session token.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const uid = await getUserId();
  if (!uid) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="font-semibold tracking-tight">custom-shortURL</Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="hover:underline">links</Link>
            <Link href="/dashboard/domains" className="hover:underline">domains</Link>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
              <button className="hover:underline" type="submit">sign out</button>
            </form>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
