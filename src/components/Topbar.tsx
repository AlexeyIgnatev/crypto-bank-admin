"use client";
import { useTheme } from "./ThemeProvider";

export default function Topbar({ title }: { title: string }) {
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-neutral-900/60 bg-white dark:bg-neutral-900 border-b border-black/10 dark:border-white/10">
      <div className="h-14 flex items-center justify-between px-4">
        <div className="text-lg font-semibold">{title}</div>
        <ThemeSwitch theme={theme} onToggle={toggle} />
      </div>
    </header>
  );
}

function ThemeSwitch({ theme, onToggle }: { theme: "light" | "dark"; onToggle: () => void }) {
  const isDark = theme === "dark";
  return (
    <button
      aria-label="Toggle theme"
      onClick={onToggle}
      className={`relative w-16 h-8 rounded-full transition-colors ${isDark ? "bg-indigo-600" : "bg-amber-400"}`}
    >
      <span className={`absolute inset-y-0 left-1 my-auto w-6 h-6 rounded-full bg-white shadow transition-transform duration-300 ${isDark ? "translate-x-8" : "translate-x-0"}`} />
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs">{isDark ? "🌙" : "☀️"}</span>
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs opacity-70">{isDark ? "" : ""}</span>
    </button>
  );
}
