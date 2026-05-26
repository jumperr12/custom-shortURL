import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-8 px-6">
      <div>
        <h1 className="text-5xl font-semibold tracking-tight">custom-shortURL</h1>
        <p className="mt-3 text-lg" style={{ color: "rgb(var(--muted))" }}>
          self-hosted url shortener. custom domains, expirable links, real analytics.
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          sign in
        </Link>
        <Link
          href="/register"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-zinc-100"
        >
          create account
        </Link>
      </div>
    </main>
  );
}
