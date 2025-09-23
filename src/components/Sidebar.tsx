"use client";
import { useState } from "react";
import { useTheme } from "./ThemeProvider";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const items = [
  { href: "/", label: "Главная", icon: "🏠" },
  { href: "/admins", label: "Администраторы", icon: "👤" },
  { href: "/users", label: "Пользователи", icon: "👥" },
  { href: "/transactions", label: "Транзакции", icon: "💳" },
  { href: "/control", label: "Фин. контроль", icon: "📊" },
  { href: "/rates", label: "Проценты", icon: "%" },
];

export default function Sidebar() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const labelClass = open ? "inline" : "sr-only";

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
                className={`mx-2 flex items-center rounded px-3 py-2 text-sm font-medium transition-colors ${open ? "gap-3 justify-start" : "justify-center"} ${
                  active
                    ? "text-white"
                    : "opacity-90 hover:opacity-100"
                }`}
                style={active ? { background: "var(--primary)" } : {}}
                title={it.label}
              >
                <span className={`text-lg ${open ? "w-5 text-center" : ""}`}>{it.icon}</span>
                {open && <span>{it.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
        <button
          className={`w-full flex items-center gap-3 px-3 py-2 rounded hover-surface text-sm overflow-hidden ${open ? '' : 'justify-center'}`}
          title="Выйти"
          onClick={async () => {
            try {
              await fetch('/api/logout', { method: 'POST' });
            } catch {}
            router.replace('/login');
          }}
        >
          <span className="shrink-0 inline-flex items-center justify-center" style={{ color: "#2563eb" }} aria-hidden="true">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h8a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
              <path d="M14 12h6" />
              <path d="M18 8l4 4-4 4" />
            </svg>
          </span>
          {open && <span>Выйти</span>}
        </button>
      </div>
    </aside>
  );
}
