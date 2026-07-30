"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentAdminRole } from "@/lib/api";

type IconName =
  | "home"
  | "admins"
  | "users"
  | "transactions"
  | "statements"
  | "reserves"
  | "bankCommissions"
  | "aml"
  | "control"
  | "rates"
  | "currencyRates"
  | "controlCases"
  | "logs"
  | "faq"
  | "terms"
  | "support"
  | "push";

const allItems: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Главная", icon: "home" },
  { href: "/admins", label: "Администраторы", icon: "admins" },
  { href: "/users", label: "Пользователи", icon: "users" },
  { href: "/transactions", label: "Транзакции", icon: "transactions" },
  { href: "/statements", label: "Выписка", icon: "statements" },
  { href: "/reserves", label: "Резервы банка", icon: "reserves" },
  { href: "/bank-commissions", label: "Комиссии банка", icon: "bankCommissions" },
  { href: "/aml-rules", label: "AML правила", icon: "aml" },
  { href: "/control", label: "Фин. контроль", icon: "control" },
  { href: "/rates", label: "Проценты", icon: "rates" },
  { href: "/currency-rates", label: "Курсы валют", icon: "currencyRates" },
  { href: "/control-cases", label: "Кейсы фин контроля", icon: "controlCases" },
  { href: "/logs", label: "Логи", icon: "logs" },
  { href: "/faq", label: "FAQ", icon: "faq" },
  { href: "/terms", label: "Термины", icon: "terms" },
  { href: "/support", label: "Техподдержка", icon: "support" },
  { href: "/push", label: "Push-уведомления", icon: "push" },
];

function allowedByRole(role?: string): string[] {
  const key = (role || "").toUpperCase();
  switch (key) {
    case "SUPER_ADMIN":
    case "UID":
      return allItems.map((i) => i.href);
    case "UIT":
      return ["/admins", "/aml-rules", "/faq", "/terms", "/support", "/push"];
    case "SKK":
      return ["/control-cases", "/aml-rules", "/faq", "/terms", "/support", "/push"];
    case "UDBO":
    case "UBUIO":
      return [
        "/transactions",
        "/statements",
        "/reserves",
        "/bank-commissions",
        "/aml-rules",
        "/faq",
        "/terms",
        "/support",
        "/push",
      ];
    case "TREASURY":
      return [
        "/rates",
        "/currency-rates",
        "/reserves",
        "/bank-commissions",
        "/aml-rules",
        "/faq",
        "/terms",
        "/support",
        "/push",
      ];
    default:
      return ["/aml-rules", "/support", "/push", "/faq", "/terms"];
  }
}

function SidebarIcon({ name }: { name: IconName }) {
  const common = "w-5 h-5 shrink-0";
  const stroke = "currentColor";

  switch (name) {
    case "home":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10.5V20h13v-9.5" />
          <path d="M9.5 20v-5h5v5" />
        </svg>
      );
    case "admins":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M16 21v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V21" />
          <circle cx="9.5" cy="7.5" r="3.5" />
          <path d="M17 11c1.7 0 3-1.3 3-3s-1.3-3-3-3" />
          <path d="M19 21v-1.2c0-1.3-.6-2.4-1.5-3.1" />
        </svg>
      );
    case "users":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="9" cy="8" r="3.25" />
          <path d="M3.5 20v-1a5.5 5.5 0 0 1 11 0v1" />
          <path d="M14.5 11.5a3.75 3.75 0 1 0 0-7.5" />
          <path d="M16.5 20v-1a4.5 4.5 0 0 0-3.5-4.4" />
        </svg>
      );
    case "transactions":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
          <path d="M7 9.5h10" />
          <path d="M7 13h5" />
          <path d="m14.5 10 2 2-2 2" />
        </svg>
      );
    case "statements":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 3.75h7.5L19 8.25V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.75a1 1 0 0 1 1-1Z" />
          <path d="M14.5 3.75V8.5H19" />
          <path d="M9 12h6" />
          <path d="M9 15h6" />
        </svg>
      );
    case "reserves":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 10h16" />
          <path d="M6 10V8l6-3 6 3v2" />
          <path d="M6.5 10v8" />
          <path d="M11.5 10v8" />
          <path d="M16.5 10v8" />
          <path d="M3.5 18.5h17" />
        </svg>
      );
    case "bankCommissions":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 4.5v15" />
          <path d="M17 8a4 4 0 0 0-4-3.5h-2A3.5 3.5 0 0 0 7.5 8c0 2 1.6 3 4.5 3s4.5 1 4.5 3a3.5 3.5 0 0 1-3.5 3.5h-2A4 4 0 0 1 6.5 14" />
        </svg>
      );
    case "aml":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3.5 19 6v5.2c0 4.4-3 7.9-7 9.3-4-1.4-7-4.9-7-9.3V6l7-2.5Z" />
          <path d="M10 12.2 11.7 14l2.8-3.2" />
        </svg>
      );
    case "control":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="M7 15.5l3-3 2.5 2.5 4.5-5" />
          <circle cx="7" cy="15.5" r="1" />
          <circle cx="10" cy="12.5" r="1" />
          <circle cx="12.5" cy="15" r="1" />
          <circle cx="17.5" cy="9.5" r="1" />
        </svg>
      );
    case "rates":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 6h12" />
          <path d="M7 18h10" />
          <path d="M10 6l-3 12" />
          <path d="M17 6l-3 12" />
        </svg>
      );
    case "currencyRates":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <path d="M8.5 11.5h7" />
          <path d="M12 8.5v7" />
          <path d="m15 4 2 2" />
        </svg>
      );
    case "controlCases":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3.5 20 7v4.5c0 4.6-3.5 7.9-8 9.5-4.5-1.6-8-4.9-8-9.5V7l8-3.5Z" />
          <path d="m9 12 2 2 4-5" />
        </svg>
      );
    case "logs":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 4.5h9L19 8v11.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Z" />
          <path d="M9 12h6" />
          <path d="M9 15h5" />
          <path d="M15 4.5V8h4" />
        </svg>
      );
    case "faq":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M9.8 9.2a2.4 2.4 0 1 1 3.9 2c-.9.6-1.5 1.2-1.5 2.3" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "terms":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 4.5h12v15H6z" />
          <path d="M9 8h6" />
          <path d="M9 12h6" />
          <path d="M9 16h4" />
        </svg>
      );
    case "support":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4.5 12a7.5 7.5 0 0 1 15 0v3.5a2 2 0 0 1-2 2H15" />
          <path d="M4.5 12v4a2 2 0 0 0 2 2h1" />
          <path d="M9 18v1.5" />
          <path d="M15 18v1.5" />
        </svg>
      );
    case "push":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 4.5v4" />
          <path d="M8.5 8.5A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 3.5 1.5" />
          <path d="M6.5 11.5a8 8 0 0 1 11 0" />
          <path d="M12 20.5a1.5 1.5 0 0 0 1.5-1.5H10.5a1.5 1.5 0 0 0 1.5 1.5Z" />
          <path d="M10 16.5h4" />
        </svg>
      );
  }
}

export default function Sidebar() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const pathname = usePathname();

  const [role, setRole] = useState<string | null>(null);
  const allowedHrefs = role ? allowedByRole(role) : allItems.map((item) => item.href);

  useEffect(() => {
    (async () => {
      try {
        const r = await getCurrentAdminRole();
        setRole(r);
        const allowed = allowedByRole(r);
        if (pathname && !allowed.includes(pathname)) router.replace(allowed[0] || "/faq");
      } catch {
        setRole(null);
      }
    })();
  }, [pathname, router]);

  return (
    <aside
      className={`sticky top-0 flex h-screen flex-col overflow-hidden border-r transition-[width,background,color,border-color] duration-300 ${
        open ? "w-64" : "w-16"
      }`}
      style={{ background: "var(--sidebar-bg)", color: "var(--sidebar-fg)", borderColor: "var(--sidebar-border)" }}
    >
      <div className={`flex items-center ${open ? "justify-between" : "justify-center"} p-3`}>
        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md hover-surface transition-transform duration-150 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          ☰
        </button>
        {open && <div className="text-sm opacity-60">&nbsp;</div>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <nav className="mt-2 space-y-1 pb-3">
          {allItems
            .filter((it) => allowedHrefs.includes(it.href))
            .map((it) => {
              const active = pathname === it.href;
              return (
                <Link key={it.href} href={it.href} className="block">
                  <div
                    className={`group mx-2 flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                      open ? "gap-3 justify-start" : "justify-center"
                    } ${
                      active
                        ? "bg-[color-mix(in_srgb,var(--primary)_12%,var(--sidebar-bg))] text-[color:var(--primary)] shadow-[inset_3px_0_0_var(--primary)]"
                        : "text-[color:var(--sidebar-fg)] hover:bg-[color-mix(in_srgb,var(--primary)_10%,var(--sidebar-bg))] hover:text-[color:var(--primary)]"
                    } active:bg-[color-mix(in_srgb,var(--primary)_16%,var(--sidebar-bg))] active:text-[color:var(--primary)] focus-within:text-[color:var(--primary)]`}
                    title={it.label}
                  >
                    <span className={`${open ? "w-5" : ""} flex items-center justify-center text-[color:var(--primary)]`}>
                      <SidebarIcon name={it.icon} />
                    </span>
                    {open && <span className="flex-1 min-w-0 truncate">{it.label}</span>}
                  </div>
                </Link>
              );
            })}
        </nav>
      </div>
      <div className="border-t p-3" style={{ borderColor: "var(--sidebar-border)" }}>
        <button
          className={`flex w-full items-center gap-3 overflow-hidden rounded-md px-3 py-2 text-sm hover-surface ${open ? "" : "justify-center"}`}
          title="Выйти"
          onClick={async () => {
            try {
              await fetch("/api/auth/logout", { method: "POST" });
            } catch {}
            router.replace("/login");
          }}
        >
          <span className="shrink-0 inline-flex items-center justify-center text-[color:var(--primary)]" aria-hidden="true">
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
