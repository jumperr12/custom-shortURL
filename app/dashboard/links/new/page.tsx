"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewLinkPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setErr(null);

    const f = new FormData(e.currentTarget);
    const body = {
      targetUrl: String(f.get("targetUrl")),
      alias: (f.get("alias") || "").toString().trim() || undefined,
      title: (f.get("title") || "").toString().trim() || undefined,
      expiresAt: (f.get("expiresAt") || "").toString().trim()
        ? new Date(String(f.get("expiresAt"))).toISOString()
        : undefined,
      password: (f.get("password") || "").toString().trim() || undefined,
    };

    const r = await fetch("/api/links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr(j?.error ?? "failed");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">new link</h1>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
        <label className="text-sm">target url
          <input name="targetUrl" type="url" required placeholder="https://example.com/some/path"
            className="mt-1 w-full rounded-md border px-3 py-2 bg-transparent" />
        </label>
        <label className="text-sm">custom alias <span style={{ color: "rgb(var(--muted))" }}>(optional)</span>
          <input name="alias" pattern="[A-Za-z0-9][A-Za-z0-9_-]{1,63}"
            className="mt-1 w-full rounded-md border px-3 py-2 bg-transparent font-mono" />
        </label>
        <label className="text-sm">title <span style={{ color: "rgb(var(--muted))" }}>(optional)</span>
          <input name="title" className="mt-1 w-full rounded-md border px-3 py-2 bg-transparent" />
        </label>
        <label className="text-sm">expires at <span style={{ color: "rgb(var(--muted))" }}>(optional)</span>
          <input name="expiresAt" type="datetime-local"
            className="mt-1 w-full rounded-md border px-3 py-2 bg-transparent" />
        </label>
        <label className="text-sm">password gate <span style={{ color: "rgb(var(--muted))" }}>(optional)</span>
          <input name="password" type="password" minLength={4}
            className="mt-1 w-full rounded-md border px-3 py-2 bg-transparent" />
        </label>

        {err && <p className="text-sm text-red-600">{err}</p>}
        <button disabled={busy}
          className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {busy ? "…" : "create"}
        </button>
      </form>
    </div>
  );
}
