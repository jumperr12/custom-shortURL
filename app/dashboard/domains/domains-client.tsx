"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type D = {
  id: string;
  hostname: string;
  verified: boolean;
  verificationToken: string;
  createdAt: string;
};

export function DomainsClient({ initial }: { initial: D[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [hostname, setHostname] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add() {
    setBusy(true); setErr(null);
    const r = await fetch("/api/domains", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ hostname }),
    });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? "failed"); return; }
    setItems([{ ...j.domain, createdAt: new Date().toISOString() }, ...items]);
    setHostname("");
  }

  async function verify(id: string) {
    const r = await fetch(`/api/domains/${id}/verify`, { method: "POST" });
    const j = await r.json();
    if (j.verified) {
      setItems(items.map((d) => (d.id === id ? { ...d, verified: true } : d)));
    } else {
      alert(j.error ?? "verification failed");
    }
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("delete this domain?")) return;
    const r = await fetch(`/api/domains/${id}`, { method: "DELETE" });
    if (r.ok) setItems(items.filter((d) => d.id !== id));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">
        <input value={hostname} onChange={(e) => setHostname(e.target.value)}
          placeholder="go.example.com"
          className="flex-1 rounded-md border px-3 py-2 bg-transparent font-mono text-sm" />
        <button onClick={add} disabled={busy || !hostname}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          add
        </button>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}

      {items.length === 0 ? (
        <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>no custom domains yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((d) => (
            <li key={d.id} className="rounded-md border p-4">
              <div className="flex items-center justify-between">
                <div className="font-mono">{d.hostname}</div>
                <div className="flex items-center gap-3 text-sm">
                  {d.verified
                    ? <span className="text-green-600">verified</span>
                    : <button onClick={() => verify(d.id)} className="underline">check dns</button>}
                  <button onClick={() => remove(d.id)} className="text-red-600 hover:underline">delete</button>
                </div>
              </div>
              {!d.verified && (
                <div className="mt-3 rounded bg-zinc-50 dark:bg-zinc-900 p-3 text-xs font-mono">
                  <div style={{ color: "rgb(var(--muted))" }}>add this TXT record then click "check dns":</div>
                  <div className="mt-1 break-all">
                    _shorturl-verify.{d.hostname} TXT {d.verificationToken}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
