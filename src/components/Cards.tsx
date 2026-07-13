"use client";
import { useEffect, useMemo, useState } from "react";
import { getStatsToday, getTransactionsStats } from "@/lib/api";

type TodayStats = {
  total: number;
  bank: number;
  wallet: number;
  users: number;
  successful: number;
  dateFrom?: string;
  dateTo?: string;
};

function formatPeriod(dateFrom?: string, dateTo?: string): string {
  if (!dateFrom || !dateTo) return "Текущий день";
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) return "Текущий день";
  const fromStr = from.toLocaleString();
  const toStr = to.toLocaleString();
  return `${fromStr} - ${toStr}`;
}

export default function Cards({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) {
  const [stats, setStats] = useState<TodayStats | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!dateFrom || !dateTo) {
          const s = await getStatsToday();
          if (alive) setStats(s);
          return;
        }

        const [totalStats, bankStats, walletStats, successfulStats, usersStats] = await Promise.all([
          getTransactionsStats({ dateFrom, dateTo, metric: "sum", bucket: "day" }),
          getTransactionsStats({ dateFrom, dateTo, metric: "sum", operations: ["bank"], bucket: "day" }),
          getTransactionsStats({ dateFrom, dateTo, metric: "sum", operations: ["crypto"], bucket: "day" }),
          getTransactionsStats({ dateFrom, dateTo, metric: "count", statuses: ["SUCCESS"], bucket: "day" }),
          getStatsToday(),
        ]);

        if (alive) {
          setStats({
            total: Number(totalStats.totalSum ?? 0),
            bank: Number(bankStats.totalSum ?? 0),
            wallet: Number(walletStats.totalSum ?? 0),
            users: Number(usersStats.users ?? 0),
            successful: Number(successfulStats.totalCount ?? 0),
            dateFrom,
            dateTo,
          });
        }
      } catch {
        if (alive) setStats({ total: 0, bank: 0, wallet: 0, users: 0, successful: 0, dateFrom, dateTo });
      }
    })();
    return () => {
      alive = false;
    };
  }, [dateFrom, dateTo]);

  const fmt = (n: number) => n.toLocaleString();
  const periodLabel = useMemo(() => formatPeriod(stats?.dateFrom, stats?.dateTo), [stats?.dateFrom, stats?.dateTo]);

  const Card = ({
    title,
    value,
    accent = false,
  }: {
    title: string;
    value: string;
    accent?: boolean;
  }) => (
    <div
      className={`metric-tile ${accent ? "metric-tile-accent" : ""} rounded-[24px] border shadow-sm`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
        {title}
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight text-[color:var(--foreground)]">
        {value}
      </div>
    </div>
  );

  return (
    <section className="space-y-4">
      <div className="page-hero flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="hero-label">Сводка</div>
          <div className="mt-2 text-lg font-semibold tracking-tight">Показатели по выбранному периоду</div>
        </div>
        <div className="rounded-full border border-soft bg-[var(--bg-soft)] px-4 py-2 text-sm text-muted">
          Период данных: {periodLabel}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card title="Общая сумма транзакций (СОМ)" value={`${fmt(stats?.total ?? 0)}`} accent />
        <Card title="Между банковскими счетами (СОМ)" value={`${fmt(stats?.bank ?? 0)}`} />
        <Card title="Между криптокошельками (СОМ)" value={`${fmt(stats?.wallet ?? 0)}`} />
        <Card title="Успешные транзакции" value={`${fmt(stats?.successful ?? 0)}`} />
        <Card title="Количество пользователей" value={`${fmt(stats?.users ?? 0)}`} accent />
      </div>
    </section>
  );
}
