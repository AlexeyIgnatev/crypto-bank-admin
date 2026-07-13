"use client";

import { useEffect, useState } from "react";
import { getSettings } from "@/lib/api";
import { useTheme } from "./ThemeProvider";

export default function Topbar({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  const { theme, toggle } = useTheme();
  const pageTitle = title || "Главная";
  const showRates = pageTitle === "Главная";

  return (
    <header
      className="relative z-10 border-b"
      style={{
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--card) 90%, transparent), color-mix(in srgb, var(--card) 78%, transparent))",
        borderColor: "var(--sidebar-border)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div className="flex min-h-[4.5rem] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
              BRICS Bank Admin
            </div>
            <div className="mt-1 flex min-w-0 items-center gap-3">
              <h1 className="truncate text-[1.1rem] font-semibold leading-tight sm:text-[1.35rem]">
                {pageTitle}
              </h1>
              {showRates && <LiveBadge />}
            </div>
            {description ? (
              <div className="mt-1 truncate text-sm text-muted">{description}</div>
            ) : null}
          </div>
          {showRates && <TopbarRates />}
        </div>
        <ThemeSwitch theme={theme} onToggle={toggle} />
      </div>
    </header>
  );
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[color-mix(in_srgb,var(--primary)_11%,transparent)] px-3 py-1 text-xs font-semibold text-[color:var(--primary-hover)]">
      <span className="h-2 w-2 rounded-full bg-[color:var(--primary)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_16%,transparent)]" />
      Live
    </span>
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
  const rateValue =
    Number.isFinite(rate) && rate > 0 ? `${fmtMoney(rate)} SOM` : "—";

  return (
    <div className="hidden xl:flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pr-2">
      <RateChip label="USD→SOM" value={rateValue} accent />
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
      className={`surface flex h-10 shrink-0 items-center gap-3 rounded-2xl px-3 text-xs whitespace-nowrap ${
        accent
          ? "bg-[color-mix(in_srgb,var(--primary)_12%,var(--card))] text-[color:var(--foreground)]"
          : ""
      }`}
    >
      <span className="text-muted">{label}</span>
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
      className="relative h-10 w-[5.25rem] shrink-0 rounded-full border border-[color:var(--border-soft)] bg-[color-mix(in_srgb,var(--card)_78%,var(--bg-soft))] p-1 shadow-sm"
    >
      <span
        className={`absolute inset-y-1 left-1 w-7 rounded-full bg-[var(--primary)] shadow-md transition-transform duration-300 ${
          isDark ? "translate-x-10" : "translate-x-0"
        }`}
      />
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[var(--foreground)] opacity-75">
        ☀
      </span>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[var(--foreground)] opacity-75">
        ☾
      </span>
    </button>
  );
}
