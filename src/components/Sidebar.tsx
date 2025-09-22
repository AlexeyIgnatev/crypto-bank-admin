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
      className={`h-screen sticky top-0 border-r transition-[width,background,color,border-color] duration-300 ${
        open ? "w-64" : "w-16"
      }`}
      style={{ background: "var(--sidebar-bg)", color: "var(--sidebar-fg)", borderColor: "var(--sidebar-border)" }}
    >
      <div className="flex items-center justify-between p-3">
        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
          className="p-2 rounded hover:bg-black/5 dark:hover:bg-white/10"
        >
          ☰
        </button>
        {/* Бренд перенесён в Topbar для выравнивания с заголовком */}
        {open && <div className="text-sm opacity-60">&nbsp;</div>}
      </div>
      <nav className="mt-2 space-y-1">
        {items.map((it) => {
          const active = pathname === it.href;
          return (
            <Link key={it.href} href={it.href} className="block">
              <div
                className={`mx-2 flex items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "text-white"
                    : "opacity-90 hover:opacity-100"
                }`}
                style={active ? { background: "var(--primary)" } : {}}
                title={it.label}
              >
                <span className="text-lg w-5 text-center">{it.icon}</span>
                {open && <span>{it.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-black/5 dark:hover:bg-white/10 text-sm">
          <span className="text-lg w-5 text-center">🚪</span>
          {open && <span>Выйти</span>}
        </button>
      </div>
    </aside>
  );
}
