"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setErr(null);

    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));

    const r = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setBusy(false);
      setErr(j?.error ?? "registration failed");
      return;
    }

    // auto-login after register so the user isn't bounced through the form twice
    await signIn("credentials", { email, password, redirect: false });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-3xl font-semibold tracking-tight">create account</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input name="email" type="email" placeholder="email" required
          className="rounded-md border px-3 py-2 bg-transparent" />
        <input name="password" type="password" placeholder="password (min 8)" required minLength={8}
          className="rounded-md border px-3 py-2 bg-transparent" />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button disabled={busy}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {busy ? "…" : "register"}
        </button>
      </form>
      <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
        already have one? <Link href="/login" className="underline">sign in</Link>
      </p>
    </main>
  );
}
