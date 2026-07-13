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
  | "bank-commissions"
  | "aml-rules"
  | "control"
  | "rates"
  | "cases"
  | "logs"
  | "faq"
  | "support"
  | "push";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

const allItems: NavItem[] = [
  { href: "/", label: "Главная", icon: "home" },
  { href: "/admins", label: "Администраторы", icon: "admins" },
  { href: "/users", label: "Пользователи", icon: "users" },
  { href: "/transactions", label: "Транзакции", icon: "transactions" },
  { href: "/statements", label: "Выписка", icon: "statements" },
  { href: "/reserves", label: "Резервы банка", icon: "reserves" },
  { href: "/bank-commissions", label: "Комиссии банка", icon: "bank-commissions" },
  { href: "/aml-rules", label: "AML правила", icon: "aml-rules" },
  { href: "/control", label: "Фин. контроль", icon: "control" },
  { href: "/rates", label: "Проценты", icon: "rates" },
  { href: "/control-cases", label: "Кейсы фин контроля", icon: "cases" },
  { href: "/logs", label: "Логи", icon: "logs" },
  { href: "/faq", label: "FAQ", icon: "faq" },
  { href: "/support", label: "Техподдержка", icon: "support" },
  { href: "/push", label: "Push-уведомления", icon: "push" },
];

function allowedByRole(role?: string): string[] {
  const key = (role || "").toUpperCase();
  switch (key) {
    case "SUPER_ADMIN":
    case "UID":
      return allItems.map((item) => item.href);
    case "UIT":
      return ["/admins", "/aml-rules", "/faq", "/support", "/push"];
    case "SKK":
      return ["/control-cases", "/aml-rules", "/faq", "/support", "/push"];
    case "UDBO":
    case "UBUIO":
      return [
        "/transactions",
        "/statements",
        "/reserves",
        "/bank-commissions",
        "/aml-rules",
        "/faq",
        "/support",
        "/push",
      ];
    case "TREASURY":
      return [
        "/rates",
        "/reserves",
        "/bank-commissions",
        "/aml-rules",
        "/faq",
        "/support",
        "/push",
      ];
    default:
      return ["/aml-rules", "/support", "/push", "/faq"];
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
        const currentRole = await getCurrentAdminRole();
        setRole(currentRole);
        const allowed = allowedByRole(currentRole);
        if (pathname && !allowed.includes(pathname)) {
          router.replace(allowed[0] || "/faq");
        }
      } catch {
        setRole(null);
      }
    })();
  }, [pathname, router]);

  return (
    <aside
      className={`sticky top-0 flex h-screen flex-col overflow-hidden border-r transition-[width,background,color,border-color] duration-300 ${
        open ? "w-72" : "w-[88px]"
      }`}
      style={{
        background: "var(--sidebar-bg)",
        color: "var(--sidebar-fg)",
        borderColor: "var(--sidebar-border)",
        backdropFilter: "blur(18px)",
      }}
    >
      <div className="border-b border-[color:var(--sidebar-border)] p-3">
        <div className="flex items-center justify-between gap-3">
          <div className={`flex min-w-0 items-center gap-3 ${open ? "flex-1" : ""}`}>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--primary)] text-white shadow-lg shadow-[color-mix(in_srgb,var(--primary)_30%,transparent)]">
              <BankMark />
            </div>
            {open && (
              <div className="min-w-0">
                <div className="truncate text-[0.95rem] font-semibold text-[color:var(--sidebar-fg)]">
                  BRICS Bank
                </div>
                <div className="truncate text-[11px] uppercase tracking-[0.22em] text-muted">
                  Admin console
                </div>
              </div>
            )}
          </div>
          <button
            aria-label="Toggle menu"
            onClick={() => setOpen((value) => !value)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[color:var(--sidebar-border)] bg-[color-mix(in_srgb,var(--card)_75%,var(--bg-soft))] text-lg transition hover:scale-[1.02] hover:bg-[color-mix(in_srgb,var(--primary)_10%,var(--card))]"
          >
            ☰
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <nav className="space-y-2">
          {allItems
            .filter((item) => allowedHrefs.includes(item.href))
            .map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className="block">
                  <div
                    className={`group relative flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-medium transition-all duration-200 ${
                      open ? "justify-start" : "justify-center"
                    } ${
                      active
                        ? "border-transparent text-white shadow-lg shadow-[color-mix(in_srgb,var(--primary)_25%,transparent)]"
                        : "border-transparent text-[color:var(--sidebar-fg)] hover:border-[color:var(--sidebar-border)] hover:bg-[color-mix(in_srgb,var(--card)_78%,var(--bg-soft))]"
                    }`}
                    style={
                      active
                        ? {
                            background: "var(--sidebar-active-bg)",
                            color: "var(--sidebar-active-fg)",
                          }
                        : {}
                    }
                    title={item.label}
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                        active
                          ? "bg-white/15"
                          : "bg-[color-mix(in_srgb,var(--primary)_7%,transparent)] text-[color:var(--primary)]"
                      }`}
                    >
                      <NavIcon name={item.icon} active={active} />
                    </span>
                    {open && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                    {active && open ? (
                      <span className="ml-auto h-2 w-2 rounded-full bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.18)]" />
                    ) : null}
                  </div>
                </Link>
              );
            })}
        </nav>
      </div>

      <div className="border-t border-[color:var(--sidebar-border)] p-3">
        <button
          className={`btn w-full ${open ? "justify-start" : "justify-center"} h-11`}
          title="Выйти"
          onClick={async () => {
            try {
              await fetch("/api/auth/logout", { method: "POST" });
            } catch {}
            router.replace("/login");
          }}
        >
          <LogoutIcon />
          {open && <span>Выйти</span>}
        </button>
      </div>
    </aside>
  );
}

function BankMark() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 10.5L12 6l8 4.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10.5V18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M10 10.5V18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M14 10.5V18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M18 10.5V18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M5 18h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 17H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 7l5 5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 12H10" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function NavIcon({ name, active }: { name: IconName; active?: boolean }) {
  const strokeWidth = active ? 2.1 : 1.9;
  const stroke = "currentColor";

  switch (name) {
    case "home":
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 11.5L12 5l8 6.5" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6.5 10.5V19h4.5v-5h2v5h4.5v-8.5" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "admins":
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="9" cy="8" r="3" stroke={stroke} strokeWidth={strokeWidth} />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M16 8h5M18.5 5.5v5" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        </svg>
      );
    case "users":
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="3" stroke={stroke} strokeWidth={strokeWidth} />
          <circle cx="16.5" cy="9.5" r="2.5" stroke={stroke} strokeWidth={strokeWidth} />
          <path d="M3.5 19a4.5 4.5 0 0 1 9 0" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M14 19a4 4 0 0 1 6 0" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        </svg>
      );
    case "transactions":
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="4" y="6" width="16" height="12" rx="3" stroke={stroke} strokeWidth={strokeWidth} />
          <path d="M7 10h10M7 14h6" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        </svg>
      );
    case "statements":
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 4h7l5 5v11H7z" stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
          <path d="M14 4v5h5" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 13h6M9 16h6" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        </svg>
      );
    case "reserves":
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 10h16" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M6 10v8M10 10v8M14 10v8M18 10v8" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M3 18h18" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M12 4l8 4H4z" stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
        </svg>
      );
    case "bank-commissions":
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 7h12v10H6z" stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
          <path d="M8 10h8M8 14h5" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <circle cx="17" cy="17" r="2" stroke={stroke} strokeWidth={strokeWidth} />
        </svg>
      );
    case "aml-rules":
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3l7 3v5c0 4.9-3.1 8.9-7 10-3.9-1.1-7-5.1-7-10V6z" stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
          <path d="M9 12l2 2 4-5" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "control":
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 18V6" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M5 18h14" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M8 14l3-3 2 2 4-6" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "rates":
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 17L17 7" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <circle cx="8" cy="8" r="2" stroke={stroke} strokeWidth={strokeWidth} />
          <circle cx="16" cy="16" r="2" stroke={stroke} strokeWidth={strokeWidth} />
        </svg>
      );
    case "cases":
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3l8 4v5c0 4.9-3.1 8.9-8 10-4.9-1.1-8-5.1-8-10V7z" stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
          <path d="M12 8v5" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <circle cx="12" cy="16.5" r="1" fill={stroke} />
        </svg>
      );
    case "logs":
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 4h10v16H7z" stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
          <path d="M9 8h6M9 12h6M9 16h4" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        </svg>
      );
    case "faq":
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 20a8 8 0 1 0-8-8" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M12 15v.01M12 11a2 2 0 1 0-2-2" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "support":
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 6h14v9H9l-4 4z" stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
          <path d="M9 10h6M9 13h4" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        </svg>
      );
    case "push":
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 4a4 4 0 0 1 4 4v3l1.5 2.5H6.5L8 11V8a4 4 0 0 1 4-4Z" stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
          <path d="M10 18a2 2 0 0 0 4 0" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}
