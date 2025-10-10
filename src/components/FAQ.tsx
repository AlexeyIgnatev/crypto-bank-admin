"use client";
import React, { useState } from "react";

export default function FAQ() {
  const [open, setOpen] = useState<string | null>("about");
  const Item = ({ id, q, children }: { id: string; q: string; children: React.ReactNode }) => (
    <div className="rounded-xl border border-soft overflow-hidden">
      <button
        className="w-full flex items-center justify-between text-left p-4 hover-surface"
        onClick={() => setOpen((o) => (o === id ? null : id))}
        aria-expanded={open === id}
      >
        <span className="font-medium">{q}</span>
        <svg className={`w-5 h-5 transition-transform ${open === id ? "rotate-180" : "rotate-0"}`} viewBox="0 0 20 20" fill="currentColor"><path d="M5 7l5 5 5-5H5z"/></svg>
      </button>
      {open === id && <div className="px-4 pb-4 text-sm text-fg/90">{children}</div>}
    </div>
  );

  return (
    <div className="space-y-3">
      <header>
        <div className="text-2xl font-bold">FAQ</div>
        <div className="text-sm text-muted">Ответы на частые вопросы</div>
      </header>
      <Item id="about" q="О проекте">
        <p>
          Crypto Bank Admin — демонстрационная админ‑панель на Next.js (App Router) с поддержкой светлой/тёмной темы и современным UI. Доступ в систему защищён простой cookie‑аутентификацией (demo: admin/admin).
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Технологии: Next.js, React, TypeScript, Tailwind (через postcss), Recharts.</li>
          <li>Страницы: Главная, Администраторы, Пользователи, Транзакции, Фин. контроль, Проценты, Кейсы фин. контроля.</li>
          <li>Все данные демо‑уровня, для ознакомления с UX и потоком работ.</li>
        </ul>
      </Item>
      <Item id="dashboard" q="Главная (Дашборд)">
        <p>Карточки со сводной статистикой за сегодня и быстрый доступ к ключевым разделам.</p>
      </Item>
      <Item id="admins" q="Администраторы">
        <p>Список админов. Создание, редактирование, удаление. Поиск и сортировка по основным полям.</p>
      </Item>
      <Item id="users" q="Пользователи">
        <p>Каталог пользователей с балансами и статусами. Просмотр карточки, редактирование, фильтрация по статусам.</p>
      </Item>
      <Item id="transactions" q="Транзакции">
        <p>
          Аналитика переводов с фильтрами по датам, статусам, валютам и типам операций. График по метрикам «Сумма»/«Количество» с группировкой по дням/неделям/месяцам. Доступен экспорт данных графика в CSV через красную кнопку «Экспорт» в правой карточке статистики.
        </p>
      </Item>
      <Item id="control" q="Финансовый контроль">
        <p>Раздел для мониторинга и управления финансовыми операциями. Настройки правил и просмотр агрегатов.</p>
      </Item>
      <Item id="rates" q="Проценты (ставки)">
        <p>Настройка ставок/процентов. Изменение параметров с валидацией и сохранением.</p>
      </Item>
      <Item id="cases" q="Кейсы финансового контроля">
        <p>Обработка кейсов (инцидентов): просмотр, фильтрация, изменение статусов.</p>
      </Item>
      <footer className="pt-2 text-xs text-muted">
        Если не нашли ответ — обратитесь к команде разработки.
      </footer>
    </div>
  );
}
