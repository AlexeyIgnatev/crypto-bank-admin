"use client";
import { useState } from "react";
import { useTheme } from "./ThemeProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Главная", icon: "🏠" },
  { href: "/admins", label: "Администраторы", icon: "👤" },
  { href: "/users", label: "Пользователи", icon: "👥" },
  { href: "/transactions", label: "Транзакции", icon: "💳" },
  { href: "/control", label: "Фин. контроль", icon: "📊" },
  { href: "/rates", label: "Проценты", icon: "%" },
];

export default function Sidebar() {
  const [open, setOpen] = useState(true);
  const { theme, toggle } = useTheme();
  const pathname = usePathname();

  return (
    <aside
      className={`h-screen sticky top-0 border-r border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 transition-[width] duration-300 ${
        open ? "w-64" : "w-16"
      }`}
    >
      <div className="flex items-center justify-between p-3">
        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
          className="p-2 rounded hover:bg-black/5 dark:hover:bg-white/10"
        >
          ☰
        </button>
        {open && <div className="text-xl font-semibold">Банк</div>}
      </div>
      <nav className="mt-2 space-y-1">
        {items.map((it) => {
          const active = pathname === it.href;
          return (
            <Link key={it.href} href={it.href} className="block">
              <div
                className={`mx-2 flex items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-red-600 text-white"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10"
                }`}
                title={it.label}
              >
                <span className="text-lg w-5 text-center">{it.icon}</span>
                {open && <span>{it.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-black/10 dark:border-white/10">
        {open && <div className="text-xs mb-2 text-neutral-500">Тема</div>}
        <button
          onClick={toggle}
          className="w-full text-left px-3 py-2 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-sm"
        >
          {theme === "light" ? "Светлая" : "Тёмная"}
        </button>
        <button className="w-full mt-2 text-left px-3 py-2 rounded hover:bg-black/5 dark:hover:bg-white/10 text-sm">
          Выйти
        </button>
      </div>
    </aside>
  );
}
