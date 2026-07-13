"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentAdminRole } from "@/lib/api";

const allItems = [
  { href: "/", label: "Главная", icon: HomeIcon },
  { href: "/admins", label: "Администраторы", icon: UserBadgeIcon },
  { href: "/users", label: "Пользователи", icon: UsersIcon },
  { href: "/transactions", label: "Транзакции", icon: CardIcon },
  { href: "/statements", label: "Выписка", icon: DocumentIcon },
  { href: "/reserves", label: "Резервы банка", icon: VaultIcon },
  { href: "/bank-commissions", label: "Комиссии банка", icon: BriefcaseIcon },
  { href: "/aml-rules", label: "AML правила", icon: ShieldIcon },
  { href: "/control", label: "Фин. контроль", icon: ChartIcon },
  { href: "/rates", label: "Проценты", icon: PercentIcon },
  { href: "/control-cases", label: "Кейсы фин контроля", icon: BadgeIcon },
  { href: "/logs", label: "Логи", icon: ListIcon },
  { href: "/faq", label: "FAQ", icon: QuestionIcon },
  { href: "/support", label: "Техподдержка", icon: MessageIcon },
  { href: "/push", label: "Push-уведомления", icon: BellIcon },
];

function allowedByRole(role?: string): string[] {
  const key = (role || "").toUpperCase();
  switch (key) {
    case "SUPER_ADMIN":
    case "UID":
      return allItems.map((i) => i.href);
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
        const r = await getCurrentAdminRole();
        setRole(r);
        const allowed = allowedByRole(r);
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
      className={`sidebar-shell sticky top-0 flex h-screen flex-col overflow-hidden transition-[width,background,color,border-color] duration-300 ${
        open ? "w-72" : "w-20"
      }`}
    >
      <div className={`flex items-center ${open ? "justify-between" : "justify-center"} px-4 py-4`}>
        {open ? (
          <div className="min-w-0">
            <div className="hero-label">Crypto Bank</div>
            <div className="mt-1 text-lg font-semibold tracking-tight">Админ-панель</div>
          </div>
        ) : null}
        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-transparent transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/30"
          style={{ background: "var(--sidebar-hover)" }}
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <nav className="space-y-1">
          {allItems
            .filter((item) => allowedHrefs.includes(item.href))
            .map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${active ? "sidebar-link-active" : ""} ${open ? "" : "justify-center px-0"}`}
                  title={item.label}
                >
                  <span className="sidebar-icon" aria-hidden="true">
                    <Icon />
                  </span>
                  {open ? <span className="min-w-0 truncate">{item.label}</span> : null}
                </Link>
              );
            })}
        </nav>
      </div>

      <div className="border-t px-3 py-4" style={{ borderColor: "var(--sidebar-border)" }}>
        <button
          className={`sidebar-link w-full ${open ? "" : "justify-center px-0"}`}
          title="Выйти"
          onClick={async () => {
            try {
              await fetch("/api/auth/logout", { method: "POST" });
            } catch {}
            router.replace("/login");
          }}
        >
          <span className="sidebar-icon" aria-hidden="true">
            <LogoutIcon />
          </span>
          {open ? <span>Выйти</span> : null}
        </button>
      </div>
    </aside>
  );
}

function MenuIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function UserBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 15a4 4 0 0 1 8 0" />
      <circle cx="12" cy="8" r="3" />
      <path d="M19 5h2v6h-2z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21a5 5 0 0 0-10 0" />
      <circle cx="12" cy="8" r="3" />
      <path d="M19 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3h8l4 4v14H7z" />
      <path d="M15 3v5h5" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  );
}

function VaultIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="16" height="14" rx="3" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 9v6M9 12h6" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M3 12h18" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 19 6v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 16v-4" />
      <path d="M12 16V8" />
      <path d="M16 16v-6" />
    </svg>
  );
}

function PercentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 5 5 19" />
      <circle cx="7" cy="7" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

function BadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h14v14l-7 4-7-4z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h12M8 12h12M8 18h12" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.1 9a3 3 0 1 1 4.4 2.6c-1.3.7-2.1 1.6-2.1 3v.4" />
      <circle cx="12" cy="18" r="1" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16v11H7l-3 3z" />
      <path d="M8 9h8M8 12h5" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 17H5l1.5-2A4 4 0 0 0 7 13V9a5 5 0 1 1 10 0v4c0 .7.2 1.4.5 2l1.5 2h-3" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 17H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h5" />
      <path d="M15 7l5 5-5 5" />
      <path d="M20 12H10" />
    </svg>
  );
}
