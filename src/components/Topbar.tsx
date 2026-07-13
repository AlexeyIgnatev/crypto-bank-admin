"use client";

import { useEffect, useState } from "react";
import { getSettings } from "@/lib/api";
import { useTheme } from "./ThemeProvider";

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
    Number.isFinite(rate) && rate > 0 ? `${fmtMoney(rate)} СОМ` : "—";

  return (
    <div className="hidden xl:flex items-center gap-2 min-w-0 flex-1 overflow-x-auto pr-2">
      <RateChip label="USD→СОМ" value={rateValue} accent />
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
        className={`absolute inset-y-0 left-1 my-auto w-6 h-6 rounded-full bg-white shadow transition-transform duration-300 ${
          isDark ? "translate-x-8" : "translate-x-0"
        }`}
      />
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs">
        {isDark ? "\u{1F319}" : "\u2600\uFE0F"}
      </span>
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs opacity-70">
        &nbsp;
      </span>
    </button>
  );
}
