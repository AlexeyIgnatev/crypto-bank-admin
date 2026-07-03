"use client";

import { TreasuryReserves } from "@/types";

const TEST_RESERVES: TreasuryReserves = {
  treasuryAddress: "TH6v4FYhVPEE39oYLd7roSfGj2H49pkRUX",
  usdtBalance: 250000,
  trxBalance: 125000,
  energyAvailable: 50000000,
  bandwidthAvailable: 25000000,
  energySpentToday: 125000,
  energySpentTotal: 8500000,
  bandwidthSpentToday: 64000,
  bandwidthSpentTotal: 4200000,
  networkFeeTrxToday: 1750,
  networkFeeTrxTotal: 98250,
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
  const reserves = TEST_RESERVES;

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="mb-4 rounded-lg border border-soft bg-card/50 px-4 py-3 text-sm text-muted">
        Тестовые значения для проверки админки резервов.
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Баланс общего кошелька USDT"
          value={`${fmtAmount(reserves.usdtBalance)} USDT`}
          hint={reserves.treasuryAddress}
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
    </div>
  );
}
