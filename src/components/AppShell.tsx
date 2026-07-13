"use client";
import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login";
  const isStandalonePage = pathname === "/tron-wallet";

  if (isAuthPage) {
    return (
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col">
          <Topbar title="Вход" />
          <main className="page-shell flex-1 overflow-hidden p-4">
            <div className="page-frame flex flex-1 items-center justify-center">
              {children}
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (isStandalonePage) {
    return <>{children}</>;
  }

  const title =
    pathname === "/"
      ? "Главная"
      : pathname === "/admins"
      ? "Администраторы"
      : pathname === "/users"
      ? "Пользователи"
      : pathname === "/transactions"
      ? "Транзакции"
      : pathname === "/statements"
      ? "Выписка"
      : pathname === "/reserves"
      ? "Резервы банка"
      : pathname === "/bank-commissions"
      ? "Комиссии банка"
      : pathname === "/aml-rules"
      ? "AML правила"
      : pathname === "/control"
      ? "Фин. контроль"
      : pathname === "/control-cases"
      ? "Кейсы фин контроля"
      : pathname === "/rates"
      ? "Проценты"
      : pathname === "/logs"
      ? "Логи"
      : pathname === "/support"
      ? "Техподдержка"
      : pathname === "/push"
      ? "Push-уведомления"
      : pathname === "/faq"
      ? "FAQ"
      : "";

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex flex-1 flex-col h-screen overflow-hidden">
        <Topbar title={title} />
        <main className="page-shell min-h-0 flex-1 overflow-hidden p-4">
          <div className="page-frame flex min-h-0 flex-1 flex-col gap-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
