"use client";

import { useEffect, useState } from "react";
import { getReserves } from "@/lib/api";
import { TreasuryReserves } from "@/types";

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card rounded-xl border border-soft p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

function fmtAmount(value: number, digits = 6) {
  return value.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function fmtInteger(value: number) {
  return value.toLocaleString("ru-RU");
}

export default function ReservesPage() {
  const [data, setData] = useState<TreasuryReserves | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const reserves = await getReserves();
        if (alive) setData(reserves);
      } catch {
        if (alive) setError("Не удалось загрузить резервы");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return <div className="m-auto text-muted">Загрузка...</div>;
  }

  if (error || !data) {
    return <div className="m-auto text-red-500">{error || "Нет данных"}</div>;
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Общий кошелек USDT"
          value={`${fmtAmount(data.usdtBalance)} USDT`}
          hint={data.treasuryAddress}
        />
        <MetricCard
          label="Общий кошелек TRX"
          value={`${fmtAmount(data.trxBalance)} TRX`}
        />
        <MetricCard
          label="Доступный газ (energy)"
          value={fmtInteger(data.energyAvailable)}
        />
        <MetricCard
          label="Двигающая сила (bandwidth)"
          value={fmtInteger(data.bandwidthAvailable)}
        />
        <MetricCard
          label="Потрачено газа за сегодня"
          value={`${fmtAmount(data.networkFeeTrxToday)} TRX`}
          hint={`Energy: ${fmtInteger(data.energySpentToday)}, двигающая сила: ${fmtInteger(data.bandwidthSpentToday)}`}
        />
        <MetricCard
          label="Потрачено газа за все время"
          value={`${fmtAmount(data.networkFeeTrxTotal)} TRX`}
          hint={`Energy: ${fmtInteger(data.energySpentTotal)}, двигающая сила: ${fmtInteger(data.bandwidthSpentTotal)}`}
        />
      </div>
    </div>
  );
}
