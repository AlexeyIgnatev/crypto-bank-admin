"use client";
import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login";

  if (isAuthPage) {
    return (
      <div className="flex" style={{ height: "100svh", overflow: "hidden" }}>
        <div className="flex-1 flex flex-col" style={{ height: "100%" }}>
          <Topbar title="Вход" />
          <main className="grid place-items-center p-6" style={{ background: "var(--bg-soft)", height: "calc(100svh - 3.5rem - 1px)", overflow: "hidden" }}>
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 flex flex-col" style={{ height: "100svh", overflow: "hidden" }}>
        <Topbar title={pathname === "/" ? "Главная" : pathname === "/admins" ? "Администраторы" : pathname === "/users" ? "Пользователи" : pathname === "/transactions" ? "Транзакции" : pathname === "/control" ? "Фин. контроль" : pathname === "/control-cases" ? "Кейсы фин контроля" : pathname === "/rates" ? "Проценты" : pathname === "/logs" ? "Логи" : pathname === "/faq" ? "FAQ" : ""} />
        <main className="min-h-0 flex-1 overflow-hidden p-4 w-full flex flex-col gap-4">{children}</main>
      </div>
    </div>
  );
}
