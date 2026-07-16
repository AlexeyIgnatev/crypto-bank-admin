"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { getFaqLabelForPath, getFaqLinkForPath } from "@/lib/faq";

const PAGE_TITLES: Record<string, string> = {
  "/": "Главная",
  "/admins": "Администраторы",
  "/users": "Пользователи",
  "/transactions": "Транзакции",
  "/statements": "Выписка",
  "/reserves": "Резервы банка",
  "/bank-commissions": "Комиссии банка",
  "/aml-rules": "AML правила",
  "/control": "Фин. контроль",
  "/control-cases": "Кейсы фин контроля",
  "/rates": "Проценты",
  "/currency-rates": "Курсы валют",
  "/logs": "Логи",
  "/support": "Техподдержка",
  "/push": "Push-уведомления",
  "/faq": "FAQ",
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login";
  const isStandalonePage = pathname === "/tron-wallet" || pathname === "/tron-wallet1";

  if (isAuthPage) {
    return (
      <div className="flex" style={{ height: "100svh", overflow: "hidden" }}>
        <div className="flex-1 flex flex-col" style={{ height: "100%" }}>
          <Topbar title="Вход" />
          <main
            className="grid place-items-center p-6"
            style={{
              background: "var(--bg-soft)",
              height: "calc(100svh - 3.5rem - 1px)",
              overflow: "hidden",
            }}
          >
            {children}
          </main>
        </div>
      </div>
    );
  }

  if (isStandalonePage) {
    return <>{children}</>;
  }

  const title = PAGE_TITLES[pathname] || "";
  const faqHref = pathname === "/faq" ? null : getFaqLinkForPath(pathname);
  const faqLabel = pathname === "/faq" ? "" : getFaqLabelForPath(pathname);

  return (
    <div className="flex">
      <Sidebar />
      <div
        className="flex-1 flex flex-col"
        style={{ height: "100svh", overflow: "hidden" }}
      >
        <Topbar title={title} faqHref={faqHref} faqLabel={faqLabel} />
        <main className="min-h-0 flex-1 overflow-hidden p-4 w-full flex flex-col gap-4">
          {children}
        </main>
      </div>
    </div>
  );
}
