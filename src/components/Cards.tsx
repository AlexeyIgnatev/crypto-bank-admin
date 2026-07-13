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
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) {
    return "Текущий день";
  }
  return `${from.toLocaleString()} - ${to.toLocaleString()}`;
}

function MetricCard({
  title,
  value,
  hint,
  accent = false,
}: {
  title: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`surface-strong relative overflow-hidden rounded-[24px] p-5 transition-transform duration-200 hover:-translate-y-0.5 ${
        accent
          ? "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--primary)_14%,var(--card)),color-mix(in_srgb,var(--card)_94%,transparent))]"
          : ""
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary),color-mix(in_srgb,var(--primary)_18%,transparent))]" />
      <div className="text-sm font-medium text-muted">{title}</div>
      <div className="mt-3 text-[1.9rem] font-semibold tracking-tight text-fg">
        {value}
      </div>
      {hint ? <div className="mt-2 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

export default function Cards({
  dateFrom,
  dateTo,
}: {
  dateFrom?: string;
  dateTo?: string;
}) {
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

        const [totalStats, bankStats, walletStats, successfulStats, usersStats] =
          await Promise.all([
            getTransactionsStats({ dateFrom, dateTo, metric: "sum", bucket: "day" }),
            getTransactionsStats({
              dateFrom,
              dateTo,
              metric: "sum",
              operations: ["bank"],
              bucket: "day",
            }),
            getTransactionsStats({
              dateFrom,
              dateTo,
              metric: "sum",
              operations: ["crypto"],
              bucket: "day",
            }),
            getTransactionsStats({
              dateFrom,
              dateTo,
              metric: "count",
              statuses: ["SUCCESS"],
              bucket: "day",
            }),
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
        if (alive) {
          setStats({
            total: 0,
            bank: 0,
            wallet: 0,
            users: 0,
            successful: 0,
            dateFrom,
            dateTo,
          });
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [dateFrom, dateTo]);

  const fmt = (n: number) => n.toLocaleString();
  const periodLabel = useMemo(
    () => formatPeriod(stats?.dateFrom, stats?.dateTo),
    [stats?.dateFrom, stats?.dateTo],
  );

  return (
    <section className="space-y-4">
      <div className="surface rounded-[24px] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
              Период данных
            </div>
            <div className="mt-1 text-sm text-fg">{periodLabel}</div>
          </div>
          <div className="rounded-full border border-[color:var(--border-soft)] bg-[color-mix(in_srgb,var(--primary)_10%,var(--card))] px-4 py-2 text-sm font-semibold text-[color:var(--primary-hover)]">
            Статистика в реальном времени
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Общая сумма транзакций (СОМ)"
          value={fmt(stats?.total ?? 0)}
          accent
        />
        <MetricCard
          title="Между банковскими счетами (СОМ)"
          value={fmt(stats?.bank ?? 0)}
        />
        <MetricCard
          title="Между криптокошельками (СОМ)"
          value={fmt(stats?.wallet ?? 0)}
        />
        <MetricCard
          title="Успешные транзакции"
          value={fmt(stats?.successful ?? 0)}
        />
        <MetricCard
          title="Количество пользователей"
          value={fmt(stats?.users ?? 0)}
          accent
        />
      </div>
    </section>
  );
}
