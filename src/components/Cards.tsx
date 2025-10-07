"use client";
import { useEffect, useState } from "react";
import { getStatsToday } from "@/lib/api";

export default function Cards() {
  const [stats, setStats] = useState<{ total: number; bank: number; wallet: number; users: number } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await getStatsToday();
        if (alive) setStats(s);
      } catch {
        if (alive) setStats({ total: 0, bank: 0, wallet: 0, users: 0 });
      }
    })();
    return () => { alive = false; };
  }, []);

  const fmt = (n: number) => n.toLocaleString();

  const Card = ({ title, value, accent = false }: { title: string; value: string; accent?: boolean }) => (
    <div className={`rounded-xl p-4 shadow-sm border transition-colors ${accent ? "bg-[var(--red)] text-white border-[color:var(--red-hover)]" : "card border-black/10 dark:border-white/10"}`}>
      <div className="text-sm text-muted">{title}</div>
      <div className="mt-2 text-2xl font-bold text-fg">{value}</div>
    </div>
  );

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card title="Общая сумма транзакций" value={`${fmt(stats?.total ?? 123_000_000)}`} accent />
      <Card title="Между банковскими счетами" value={`${fmt(stats?.bank ?? 23_000_000)}`} />
      <Card title="Между криптокошельками" value={`${fmt(stats?.wallet ?? 45_000_000)}`} />
      <Card title="Количество пользователей" value={`${fmt(stats?.users ?? 1_230_000)}`} accent />
    </section>
  );
}
