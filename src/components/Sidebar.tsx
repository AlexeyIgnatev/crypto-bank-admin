"use client";
import { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentAdminRole } from "@/lib/api";

const allItems = [
  { href: "/", label: "Р“Р»Р°РІРЅР°СЏ", icon: "рџЏ " },
  { href: "/admins", label: "РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂС‹", icon: "рџ‘¤" },
  { href: "/users", label: "РџРѕР»СЊР·РѕРІР°С‚РµР»Рё", icon: "рџ‘Ґ" },
  { href: "/transactions", label: "РўСЂР°РЅР·Р°РєС†РёРё", icon: "рџ’і" },
  { href: "/control", label: "Р¤РёРЅ. РєРѕРЅС‚СЂРѕР»СЊ", icon: "рџ“Љ" },
  { href: "/rates", label: "РџСЂРѕС†РµРЅС‚С‹", icon: "%" },
  { href: "/control-cases", label: "РљРµР№СЃС‹ С„РёРЅ РєРѕРЅС‚СЂРѕР»СЏ", icon: "рџ›ЎпёЏ" },
  { href: "/logs", label: "Р›РѕРіРё", icon: "рџ§ѕ" },
  { href: "/faq", label: "FAQ", icon: "вќ“" },
  { href: "/support", label: "Техподдержка", icon: "💬" },
];

function allowedByRole(role?: string): string[] {
  const key = (role || "").toUpperCase();
  switch (key) {
    case "SUPER_ADMIN":
    case "UID":
      return allItems.map((i) => i.href);
    case "UIT":
      return ["/admins", "/faq", "/support"];
    case "SKK":
      return ["/control-cases", "/faq", "/support"];
    case "UDBO":
    case "UBUIO":
      return ["/transactions", "/faq", "/support"];
    case "TREASURY":
      return ["/rates", "/faq", "/support"];
    default:
      return ["/support", "/faq"];
  }
}

export default function Sidebar() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const labelClass = open ? "inline" : "sr-only";

  const [role, setRole] = useState<string | null>(null);
  const allowedHrefs = allowedByRole(role || "");

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
  }, [pathname]);

  return (
    <aside
      className={`h-screen sticky top-0 border-r transition-[width,background,color,border-color] duration-300 ${
        open ? "w-64" : "w-16"
      }`}
      style={{ background: "var(--sidebar-bg)", color: "var(--sidebar-fg)", borderColor: "var(--sidebar-border)" }}
    >
      <div className={`flex items-center ${open ? "justify-between" : "justify-center"} p-3`}>
        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
          className="h-10 w-10 inline-flex items-center justify-center rounded-md hover-surface transition-transform duration-150 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          в°
        </button>
        {/* Р‘СЂРµРЅРґ РїРµСЂРµРЅРµСЃС‘РЅ РІ Topbar РґР»СЏ РІС‹СЂР°РІРЅРёРІР°РЅРёСЏ СЃ Р·Р°РіРѕР»РѕРІРєРѕРј */}
        {open && <div className="text-sm opacity-60">&nbsp;</div>}
      </div>
      <nav className="mt-2 space-y-1">
        {allItems.filter(it => allowedHrefs.includes(it.href)).map((it) => {
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
                {open && <span className="flex-1 min-w-0 truncate">{it.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
        <button
          className={`w-full flex items-center gap-3 px-3 py-2 rounded hover-surface text-sm overflow-hidden ${open ? '' : 'justify-center'}`}
          title="Р’С‹Р№С‚Рё"
          onClick={async () => {
            try {
              await fetch('/api/auth/logout', { method: 'POST' });
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
          {open && <span>Р’С‹Р№С‚Рё</span>}
        </button>
      </div>
    </aside>
  );
}


