"use client";
import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const PAGE_META: Record<string, { title: string; description?: string }> = {
  "/": {
    title: "Главная",
    description: "Сводка по транзакциям, балансам и активности системы.",
  },
  "/admins": {
    title: "Администраторы",
    description: "Управление доступами и ролями административной команды.",
  },
  "/users": {
    title: "Пользователи",
    description: "Каталог клиентов с балансами, фильтрами и карточками.",
  },
  "/transactions": {
    title: "Транзакции",
    description: "Реестр операций, статусов, комиссий и выгрузок.",
  },
  "/statements": {
    title: "Выписка",
    description: "Детализированный журнал финансовых движений и отчётов.",
  },
  "/reserves": {
    title: "Резервы банка",
    description: "Живые остатки treasury, сетевые ресурсы и расход.",
  },
  "/bank-commissions": {
    title: "Комиссии банка",
    description:
      "Реквизиты и распределение комиссий между ЦБ, банком и партнёрами.",
  },
  "/aml-rules": {
    title: "AML правила",
    description: "Правила антифрода, проверки и сценарии ручного контроля.",
  },
  "/control": {
    title: "Фин. контроль",
    description: "Наблюдение за финансовыми агрегатами и состояниями.",
  },
  "/control-cases": {
    title: "Кейсы фин. контроля",
    description: "Список инцидентов с маршрутизацией и проверкой.",
  },
  "/rates": {
    title: "Проценты",
    description: "Тарифная сетка, комиссии и правила расчёта.",
  },
  "/logs": {
    title: "Логи",
    description: "Аудит действий администраторов и системные события.",
  },
  "/support": {
    title: "Техподдержка",
    description: "Обработка обращений и диалогов с пользователями.",
  },
  "/push": {
    title: "Push-уведомления",
    description: "Рассылка уведомлений и контроль сообщений.",
  },
  "/faq": {
    title: "FAQ",
    description: "Короткая справка по возможностям панели.",
  },
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login";
  const isStandalonePage = pathname === "/tron-wallet";
  const meta = PAGE_META[pathname] || { title: "" };

  if (isAuthPage) {
    return (
      <div className="flex" style={{ height: "100svh", overflow: "hidden" }}>
        <div className="flex-1 flex flex-col" style={{ height: "100%" }}>
          <Topbar
            title="Вход"
            description="Доступ в административную панель"
          />
          <main
            className="grid place-items-center p-6"
            style={{
              background:
                "radial-gradient(circle at top, color-mix(in srgb, var(--primary) 8%, transparent), transparent 35%), var(--bg-soft)",
              height: "calc(100svh - 4.5rem - 1px)",
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

  return (
    <div className="flex min-h-screen overflow-hidden">
      <Sidebar />
      <div
        className="flex-1 flex flex-col min-w-0"
        style={{ height: "100svh", overflow: "hidden" }}
      >
        <Topbar title={meta.title} description={meta.description} />
        <main className="min-h-0 flex-1 overflow-hidden p-4 sm:p-5 w-full flex flex-col">
          <div className="page-frame min-h-0 flex-1 overflow-hidden rounded-[30px] p-4 sm:p-5">
            <div className="flex min-h-0 h-full flex-col gap-4">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
