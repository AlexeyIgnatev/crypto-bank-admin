"use client";

import { useEffect, useState } from "react";
import { getReserves } from "@/lib/api";
import { TreasuryReserves } from "@/types";

const EMPTY_RESERVES: TreasuryReserves = {
  treasuryAddress: "",
  usdtBalance: 0,
  salamBalance: 0,
  salamSpentToday: 0,
  salamSpentTotal: 0,
  bricsBalance: 0,
  trxBalance: 0,
  energyAvailable: 0,
  bandwidthAvailable: 0,
  energySpentToday: 0,
  energySpentTotal: 0,
  bandwidthSpentToday: 0,
  bandwidthSpentTotal: 0,
  networkFeeTrxToday: 0,
  networkFeeTrxTotal: 0,
  bricsBurnedToday: 0,
  bricsBurnedTotal: 0,
};

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
  const [data, setData] = useState<TreasuryReserves>(EMPTY_RESERVES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const reserves = await getReserves();
        if (alive) setData(reserves);
      } catch {
        if (alive) setData(EMPTY_RESERVES);
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

  const reserves = data;

  return (
    <div className="flex-1 min-h-0 overflow-auto pb-8">
      <div className="w-full max-w-[1400px] px-4">
        <div className="mb-4 rounded-lg border border-soft bg-card/50 px-4 py-3 text-sm text-muted">
          Живые резервы treasury и расход TRON-ресурсов.
        </div>

        <section className="rounded-2xl border border-soft bg-card/50 p-5">
          <div className="mb-4">
            <div className="text-lg font-semibold">Данные по USDT TRC20</div>
            <div className="mt-1 text-sm text-muted">
              Живые значения treasury-кошелька из backend.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Treasury кошелёк"
              value={reserves.treasuryAddress || "—"}
            />
            <MetricCard
              label="Баланс общего кошелька USDT TRC20"
              value={`${fmtAmount(reserves.usdtBalance)} USDT TRC20`}
              hint="Баланс token-контракта treasury"
            />
            <MetricCard
              label="Баланс общего кошелька TRX"
              value={`${fmtAmount(reserves.trxBalance)} TRX`}
            />
            <MetricCard
              label="Доступный газ (energy)"
              value={fmtInteger(reserves.energyAvailable)}
            />
            <MetricCard
              label="Двигающая сила (bandwidth)"
              value={fmtInteger(reserves.bandwidthAvailable)}
            />
            <MetricCard
              label="Потрачено газа за сегодня"
              value={`${fmtAmount(reserves.networkFeeTrxToday)} TRX`}
              hint={`Energy: ${fmtInteger(reserves.energySpentToday)}, bandwidth: ${fmtInteger(reserves.bandwidthSpentToday)}`}
            />
            <MetricCard
              label="Потрачено газа за все время"
              value={`${fmtAmount(reserves.networkFeeTrxTotal)} TRX`}
              hint={`Energy: ${fmtInteger(reserves.energySpentTotal)}, bandwidth: ${fmtInteger(reserves.bandwidthSpentTotal)}`}
            />
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-soft bg-card/50 p-5">
          <div className="mb-4">
            <div className="text-lg font-semibold">Данные по САЛАМ</div>
            <div className="mt-1 text-sm text-muted">Основной баланс treasury.</div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Основной баланс SALAM"
              value={`${fmtAmount(reserves.salamBalance)} SALAM`}
            />
            <MetricCard
              label="Потрачено SALAM за сегодня"
              value={`${fmtAmount(reserves.salamSpentToday)} SALAM`}
            />
            <MetricCard
              label="Потрачено SALAM за все время"
              value={`${fmtAmount(reserves.salamSpentTotal)} SALAM`}
            />
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-soft bg-card/50 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Количество BRICS"
              value={`${fmtAmount(reserves.bricsBalance)} BRICS`}
            />
            <MetricCard
              label="Сожжено BRICS за сегодня"
              value={`${fmtAmount(reserves.bricsBurnedToday)} BRICS`}
            />
            <MetricCard
              label="Сожжено BRICS за все время"
              value={`${fmtAmount(reserves.bricsBurnedTotal)} BRICS`}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
