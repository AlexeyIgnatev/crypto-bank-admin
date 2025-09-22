"use client";
import { useTheme } from "./ThemeProvider";

export default function Topbar({ title }: { title: string }) {
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-neutral-900/60 bg-white dark:bg-neutral-900 border-b border-black/10 dark:border-white/10">
      <div className="h-14 flex items-center justify-between px-4">
        <div className="text-lg font-semibold">{title}</div>
        <button onClick={toggle} className="px-3 py-1.5 rounded border text-sm hover:bg-black/5 dark:hover:bg-white/10">
          {theme === "light" ? "Тёмная тема" : "Светлая тема"}
        </button>
      </div>
    </header>
  );
}
