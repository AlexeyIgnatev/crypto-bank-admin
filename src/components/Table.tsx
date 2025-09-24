"use client";
import { useMemo, useState, useEffect, useRef, useLayoutEffect } from "react";
import { Transaction } from "../types";

export type SortKey = "createdAt" | "amount" | "status" | "id";
export type SortDir = "asc" | "desc";

export default function Table({ data, onOpen }: { data: Transaction[]; onOpen: (t: Transaction) => void }) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  // Для бесконечной прокрутки будем увеличивать windowSize по мере скролла
  const [windowSize, setWindowSize] = useState(20); // стартовое окно: минимально достаточное, далее подстроим по высоте
  const ensureScrollTries = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // выясним доступную высоту для контейнера и будем полагаться на CSS overflow
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Убедимся, что у всех предков min-h-0, иначе flex-дети могут не сжиматься
    // В текущем коде это сделано в AppShell и page.tsx
  }, []);

  // Обеспечиваем, что окно рендера заполняет видимую область,
  // и появляется скролл только когда данных больше, чем помещается
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const firstRow = el.querySelector("tbody tr") as HTMLElement | null;
      const rowH = firstRow?.offsetHeight || 48;
      const available = el.clientHeight;
      if (!available || !rowH) return;
      const rowsFit = Math.max(1, Math.floor(available / rowH));
      const overflows = data.length > rowsFit;
      const target = overflows ? Math.min(data.length, rowsFit + 12) : data.length;
      setWindowSize((n) => (n !== target ? target : n));
    };
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [data.length]);

  // После рендера гарантируем появление скролла, если данных больше, чем помещается (пару попыток)
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (data.length > windowSize && el.scrollHeight <= el.clientHeight && ensureScrollTries.current < 3) {
      ensureScrollTries.current += 1;
      setWindowSize((n) => Math.min(n + 20, data.length));
    } else if (el.scrollHeight > el.clientHeight) {
      ensureScrollTries.current = 0;
    }
  }, [windowSize, data.length]);




  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...data].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (sortKey === "createdAt") return (new Date(va).getTime() - new Date(vb).getTime()) * dir;
      if (sortKey === "amount") return ((va as number) - (vb as number)) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [data, sortDir, sortKey]);

  const pageData = sorted.slice(0, windowSize);

  // бесконечная подгрузка: при прокрутке вниз почти до конца увеличиваем окно
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = () => {
      const threshold = 200; // px до низа, когда начинаем подгружать
      if (el.scrollTop + el.clientHeight + threshold >= el.scrollHeight) {
        setWindowSize((n) => Math.min(n + 20, sorted.length));
      }
    };
    el.addEventListener("scroll", handler);
    return () => el.removeEventListener("scroll", handler);
  }, [sorted.length]);


  // При смене сортировки/набора данных возвращаемся к начальному окну
  useEffect(() => {
    setWindowSize(20);
  }, [sortKey, sortDir, data]);


  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-black/10 dark:border-white/10 overflow-hidden card shadow-sm mb-4">
      {/* Непрокручиваемая шапка на всю ширину карточки */}
      <div className="shrink-0 rounded-t-xl" style={{ background: "var(--primary)" }}>
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[72px]" />
            <col className="w-[240px]" />
            <col className="w-[140px]" />
            <col className="w-[200px]" />
            <col className="w-[160px]" />
            <col />
            <col />
          </colgroup>
          <thead className="text-white">
            <tr>
              <Th>№</Th>
              <Th onClick={() => toggleSort("id")} active={sortKey === "id"} dir={sortDir}>ID/tx_hash</Th>
              <Th onClick={() => toggleSort("status")} active={sortKey === "status"} dir={sortDir}>Статус</Th>
              <Th onClick={() => toggleSort("createdAt")} active={sortKey === "createdAt"} dir={sortDir}>Дата</Th>
              <Th onClick={() => toggleSort("amount")} active={sortKey === "amount"} dir={sortDir}>Сумма</Th>
              <Th>Отправитель</Th>
              <Th>Получатель</Th>
            </tr>
          </thead>
        </table>
      </div>

      {/* Прокручиваемое тело таблицы. Скроллбар начинается под шапкой */}
      <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-auto [overscroll-behavior:contain] bg-[var(--card)] pb-3">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[72px]" />
            <col className="w-[240px]" />
            <col className="w-[140px]" />
            <col className="w-[200px]" />
            <col className="w-[160px]" />
            <col />
            <col />
          </colgroup>
          <tbody>
            {pageData.map((t, idx) => (
              <tr key={t.id} className="border-b border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer" onClick={() => onOpen(t)}>
                <td className="px-4 py-3 tabular-nums text-muted">{idx + 1}</td>
                <td className="px-4 py-3 font-mono truncate" title={t.id}>{t.id}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${
                    t.status === "confirmed" ? "badge-success" :
                    t.status === "pending" ? "badge-warning" :
                    "badge-danger"
                  }`}>
                    {t.status === "confirmed" ? "Подтверждено" : t.status === "pending" ? "В ожидании" : "Отклонено"}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{new Date(t.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 whitespace-nowrap">{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {t.currency}</td>
                <td className="px-4 py-3 truncate" title={t.sender}>{t.sender}</td>
                <td className="px-4 py-3 truncate" title={t.recipient}>{t.recipient}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, onClick, active, dir }: { children: React.ReactNode; onClick?: () => void; active?: boolean; dir?: SortDir }) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold select-none whitespace-nowrap ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1">
        <span>{children}</span>
        {onClick && dir && (
          <span className={`transition-transform ${active ? "opacity-100" : "opacity-40"}`}>
            {dir === "asc" ? "↑" : "↓"}
          </span>
        )}
      </div>
    </th>
  );
}
