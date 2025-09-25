"use client";
import { useMemo, useRef, useLayoutEffect, useEffect, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Transaction } from "../types";

export type SortKey = "createdAt" | "amount" | "status" | "id";
export type SortDir = "asc" | "desc";

export default function Table({ data, onOpen }: { data: Transaction[]; onOpen: (t: Transaction) => void }) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const containerRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Убедимся, что у всех предков min-h-0, иначе flex-дети могут не сжиматься
    // В текущем коде это сделано в AppShell и page.tsx
  }, []);






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

  // Виртуализация через @tanstack/react-virtual
  const rowHeight = 48;
  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
  });

  // При смене сортировки — прокручиваем в начало
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTo({ top: 0 });
  }, [sortKey, sortDir]);


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

      {/* Прокручиваемое тело таблицы c виртуализацией */}
      <div ref={containerRef} className="table-scroll flex-1 min-h-0 overflow-y-auto overflow-x-auto [overscroll-behavior:contain] bg-[var(--card)] pb-3">
        <div
          style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}
        >
          <table className="w-full text-sm table-fixed" style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
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
              {rowVirtualizer.getVirtualItems().map((vRow) => {
                const t = sorted[vRow.index];
                if (!t) return null;
                return (
                  <tr
                    key={t.id}
                    className="border-b border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    onClick={() => onOpen(t)}
                    style={{ transform: `translateY(${vRow.start}px)` }}
                  >
                    <td className="px-4 py-3 tabular-nums text-muted">{vRow.index + 1}</td>
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
                );
              })}
            </tbody>
          </table>
        </div>
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
