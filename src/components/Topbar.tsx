"use client";

import { useEffect, useMemo, useState } from "react";
import { getSettings, getTariffs, TariffOperation, TariffSetting } from "@/lib/api";
import { useTheme } from "./ThemeProvider";

const TOPBAR_OPERATION_ORDER: { operation: TariffOperation; label: string }[] = [
  { operation: "SOM_TO_ESOM", label: "СОМ→САЛАМ" },
  { operation: "ESOM_TO_SOM", label: "САЛАМ→СОМ" },
  { operation: "WALLET_TRANSFER_ESOM", label: "САЛАМ→САЛАМ" },
  { operation: "ESOM_TO_USDT_TRC20", label: "САЛАМ→USDT" },
  { operation: "USDT_TRC20_TO_ESOM", label: "USDT→САЛАМ" },
  { operation: "WALLET_TRANSFER_USDT_TRC20", label: "USDT→USDT" },
];

export default function Topbar({ title }: { title?: string }) {
  const { theme, toggle } = useTheme();
  const pageTitle = title || "Главная";
  const showRates = pageTitle === "Главная";

  return (
    <header
      className="relative z-10 border-b"
      style={{
        background: "color-mix(in srgb, var(--card) 70%, transparent)",
        borderColor: "var(--sidebar-border)",
      }}
    >
      <div className="h-14 flex items-center justify-between px-4 gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-xl font-semibold">Банк</div>
            <div className="text-muted">/</div>
            <div className="text-xl font-semibold">{pageTitle}</div>
          </div>
          {showRates && <TopbarRates />}
        </div>
        <ThemeSwitch theme={theme} onToggle={toggle} />
      </div>
    </header>
  );
}

function TopbarRates() {
  const [settings, setSettings] = useState<Record<string, string> | null>(null);
  const [tariffs, setTariffs] = useState<TariffSetting[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [settingsResult, tariffsResult] = await Promise.allSettled([
        getSettings(),
        getTariffs(),
      ]);

      if (!alive) return;

      if (settingsResult.status === "fulfilled") {
        setSettings(settingsResult.value);
      }
      if (tariffsResult.status === "fulfilled") {
        setTariffs(tariffsResult.value);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const currentCategory = "K1";
  const currentResidency = "RESIDENT";

  const tariffByOperation = useMemo(() => {
    const rows =
      tariffs?.filter(
        (item) =>
          item.category === currentCategory &&
          item.residency === currentResidency,
      ) ?? [];
    return new Map(rows.map((row) => [row.operation, row]));
  }, [currentCategory, currentResidency, tariffs]);

  const rate = Number(settings?.esom_per_usd ?? NaN);
  const rateValue =
    Number.isFinite(rate) && rate > 0 ? `${fmtMoney(rate)} СОМ` : "—";

  return (
    <div className="hidden xl:flex items-center gap-2 min-w-0 flex-1 overflow-x-auto pr-2">
      <RateChip label="USD→СОМ" value={rateValue} accent />
      {TOPBAR_OPERATION_ORDER.map((item) => {
        const row = tariffByOperation.get(item.operation);
        return (
          <RateChip
            key={item.operation}
            label={item.label}
            value={formatTariffValue(row)}
          />
        );
      })}
    </div>
  );
}

function formatTariffValue(row?: TariffSetting) {
  if (!row) return "—";
  const percent = fmtPercent(row.percent_fee);
  const fixed = Number(row.fixed_fee ?? 0);
  if (!Number.isFinite(fixed) || fixed <= 0) return percent;
  return `${percent} + ${fmtMoney(fixed)}`;
}

function RateChip({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`h-8 px-3 rounded-md border flex items-center gap-2 text-xs whitespace-nowrap shrink-0 ${
        accent ? "bg-[var(--primary)] text-white" : "bg-[var(--bg-soft)]"
      }`}
      style={{ borderColor: "var(--border-soft)" }}
    >
      <span className={accent ? "opacity-90" : "text-muted"}>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function fmtMoney(value: number) {
  return value.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtPercent(value?: string) {
  const n = Number(value);
  return Number.isFinite(n)
    ? `${n.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}%`
    : "—";
}

function ThemeSwitch({
  theme,
  onToggle,
}: {
  theme: "light" | "dark";
  onToggle: () => void;
}) {
  const isDark = theme === "dark";
  return (
    <button
      aria-label="Toggle theme"
      onClick={onToggle}
      className="relative w-16 h-8 rounded-full transition-colors shrink-0"
      style={{ background: "var(--primary)" }}
    >
      <span
        className={`absolute inset-y-0 left-1 my-auto w-6 h-6 rounded-full bg-white shadow transition-transform duration-300 ${isDark ? "translate-x-8" : "translate-x-0"}`}
      />
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs">
        {isDark ? "🌙" : "☀️"}
      </span>
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs opacity-70">
        &nbsp;
      </span>
    </button>
  );
}
