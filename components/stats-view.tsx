"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

type Range = "24h" | "7d" | "30d" | "90d";
type Stats = {
  range: Range;
  total: number;
  uniques: number;
  series: { t: string; clicks: number; uniques: number }[];
  countries: { key: string; count: number }[];
  referrers: { key: string; count: number }[];
  devices:   { key: string; count: number }[];
  browsers:  { key: string; count: number }[];
};

const RANGES: Range[] = ["24h", "7d", "30d", "90d"];

export function StatsView({ linkId }: { linkId: string }) {
  const [range, setRange] = useState<Range>("7d");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/links/${linkId}/stats?range=${range}`)
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setStats(j); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [linkId, range]);

  const series = useMemo(() => {
    if (!stats) return [];
    // pretty-print bucket labels client-side so the server payload stays compact
    return stats.series.map((b) => ({
      ...b,
      label: range === "24h"
        ? new Date(b.t).toLocaleTimeString([], { hour: "2-digit" })
        : new Date(b.t).toLocaleDateString([], { month: "short", day: "numeric" }),
    }));
  }, [stats, range]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        {RANGES.map((r) => (
          <button key={r}
            onClick={() => setRange(r)}
            className={`rounded-md border px-3 py-1 text-sm ${r === range ? "bg-zinc-900 text-white" : ""}`}>
            {r}
          </button>
        ))}
        <a href={`/api/links/${linkId}/export`}
           className="ml-auto rounded-md border px-3 py-1 text-sm hover:bg-zinc-100">
          export csv
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Stat title="clicks" value={stats?.total ?? 0} loading={loading} />
        <Stat title="unique visitors" value={stats?.uniques ?? 0} loading={loading} />
      </div>

      <div className="h-72 w-full rounded-md border p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="label" fontSize={11} />
            <YAxis fontSize={11} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="clicks"  dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="uniques" dot={false} strokeWidth={2} strokeDasharray="4 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BreakdownCard title="countries" rows={stats?.countries} />
        <BreakdownCard title="referrers" rows={stats?.referrers} />
        <BreakdownCard title="devices"   rows={stats?.devices} />
        <BreakdownCard title="browsers"  rows={stats?.browsers} />
      </div>
    </div>
  );
}

function Stat({ title, value, loading }: { title: string; value: number; loading: boolean }) {
  return (
    <div className="rounded-md border p-4">
      <div className="text-xs uppercase tracking-wide" style={{ color: "rgb(var(--muted))" }}>{title}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums">
        {loading ? "…" : value.toLocaleString()}
      </div>
    </div>
  );
}

function BreakdownCard({ title, rows }: { title: string; rows?: { key: string; count: number }[] }) {
  const max = rows && rows.length ? rows[0].count : 1;
  return (
    <div className="rounded-md border p-4">
      <div className="mb-2 text-xs uppercase tracking-wide" style={{ color: "rgb(var(--muted))" }}>{title}</div>
      {!rows || rows.length === 0 ? (
        <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>no data</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <li key={r.key} className="relative text-sm">
              <div className="absolute inset-y-0 left-0 rounded-sm bg-indigo-500/15"
                   style={{ width: `${(r.count / max) * 100}%` }} />
              <div className="relative flex justify-between px-2 py-0.5">
                <span className="truncate">{r.key}</span>
                <span className="tabular-nums">{r.count}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
