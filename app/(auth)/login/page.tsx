"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const f = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(f.get("email")),
      password: String(f.get("password")),
      redirect: false,
    });
    setBusy(false);
    if (res?.error) { setErr("wrong email or password"); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-3xl font-semibold tracking-tight">sign in</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input name="email" type="email" placeholder="email" required
          className="rounded-md border px-3 py-2 bg-transparent" />
        <input name="password" type="password" placeholder="password" required minLength={8}
          className="rounded-md border px-3 py-2 bg-transparent" />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button disabled={busy}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {busy ? "…" : "sign in"}
        </button>
      </form>
      <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
        no account? <Link href="/register" className="underline">create one</Link>
      </p>
    </main>
  );
}
