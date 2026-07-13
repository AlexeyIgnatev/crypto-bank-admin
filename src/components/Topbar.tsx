"use client";

import { useEffect, useState } from "react";
import { getSettings } from "@/lib/api";
import { useTheme } from "./ThemeProvider";

export default function Topbar({ title }: { title?: string }) {
  const { theme, toggle } = useTheme();
  const pageTitle = title || "Главная";
  const showRates = pageTitle === "Главная";

  return (
    <header className="topbar-shell relative z-10 border-b">
      <div className="flex h-18 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="min-w-0">
          <div className="topbar-kicker">Административная панель</div>
          <div className="mt-1 flex items-center gap-3 min-w-0">
            <div className="topbar-title truncate">{pageTitle}</div>
            <span className="hidden sm:inline-flex h-6 items-center rounded-full border px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              White / Red
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {showRates ? <TopbarRates /> : null}
          <ThemeSwitch theme={theme} onToggle={toggle} />
        </div>
      </div>
    </header>
  );
}

function TopbarRates() {
  const [settings, setSettings] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const settingsResult = await getSettings();
        if (alive) {
          setSettings(settingsResult);
        }
      } catch {
        if (alive) {
          setSettings(null);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const rate = Number(settings?.esom_per_usd ?? NaN);
  const rateValue = Number.isFinite(rate) && rate > 0 ? `${fmtMoney(rate)} SOM` : "—";

  return (
    <div className="hidden xl:flex items-center gap-2">
      <RateChip label="USD → SOM" value={rateValue} accent />
    </div>
  );
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
      className={`h-10 px-4 rounded-2xl border flex items-center gap-3 text-xs whitespace-nowrap shrink-0 shadow-sm ${
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
      className="relative flex h-11 w-[4.75rem] shrink-0 items-center rounded-full border border-soft transition-colors"
      style={{ background: "var(--card)" }}
    >
      <span
        className={`absolute inset-y-0 left-1 my-auto h-9 w-9 rounded-full shadow transition-transform duration-300 ${
          isDark ? "translate-x-14 bg-[var(--primary)]" : "translate-x-0 bg-white"
        }`}
      />
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
        {isDark ? "ON" : "OFF"}
      </span>
    </button>
  );
}
