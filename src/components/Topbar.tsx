"use client";
import { useEffect, useState } from "react";
import { getSettings } from "@/lib/api";
import { useTheme } from "./ThemeProvider";

export default function Topbar({ title }: { title?: string }) {
  const { theme, toggle } = useTheme();
  const pageTitle = title || "Главная";
  const showRates = pageTitle === "Главная";

  return (
    <header className="relative z-10 border-b" style={{ background: "color-mix(in srgb, var(--card) 70%, transparent)", borderColor: "var(--sidebar-border)" }}>
      <div className="h-14 flex items-center justify-between px-4">
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
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getSettings();
        if (alive) setSettings(data);
      } catch {
        if (alive) setError(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  const esomPerUsd = Number(settings?.esom_per_usd ?? NaN);
  const rate = Number.isFinite(esomPerUsd) && esomPerUsd > 0 ? fmtMoney(esomPerUsd) : "—";
  const somFee = settings?.esom_som_conversion_fee_pct ? fmtPercent(settings.esom_som_conversion_fee_pct) : "—";

  return (
    <div className="hidden xl:flex items-center gap-2 min-w-0">
      <RateChip label="USD→САЛАМ" value={error ? "Ошибка" : settings ? rate : "..."} />
      <RateChip label="USDT→САЛАМ" value={error ? "Ошибка" : settings ? rate : "..."} />
      <RateChip label="СОМ↔САЛАМ" value={error ? "Ошибка" : settings ? `1:1, ${somFee}` : "..."} />
    </div>
  );
}

function RateChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="h-8 px-3 rounded-md border border-soft bg-[var(--bg-soft)] flex items-center gap-2 text-xs whitespace-nowrap">
      <span className="text-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function fmtMoney(value: number) {
  return value.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPercent(value?: string) {
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}%` : "—";
}

function ThemeSwitch({ theme, onToggle }: { theme: "light" | "dark"; onToggle: () => void }) {
  const isDark = theme === "dark";
  return (
    <button
      aria-label="Toggle theme"
      onClick={onToggle}
      className="relative w-16 h-8 rounded-full transition-colors shrink-0"
      style={{ background: "var(--primary)" }}
    >
      <span className={`absolute inset-y-0 left-1 my-auto w-6 h-6 rounded-full bg-white shadow transition-transform duration-300 ${isDark ? "translate-x-8" : "translate-x-0"}`} />
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs">{isDark ? "🌙" : "☀️"}</span>
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs opacity-70">&nbsp;</span>
    </button>
  );
}
