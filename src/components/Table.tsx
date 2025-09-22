"use client";
import { useMemo, useState } from "react";
import { Transaction } from "../types";

export type SortKey = "createdAt" | "amount" | "status" | "id";
export type SortDir = "asc" | "desc";

export default function Table({ data, onOpen }: { data: Transaction[]; onOpen: (t: Transaction) => void }) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

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

  const totalPages = Math.max(1, Math.ceil(sorted.length / size));
  const pageData = sorted.slice((page - 1) * size, page * size);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden bg-white dark:bg-neutral-900">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-red-600 text-white">
            <tr>
              <Th onClick={() => toggleSort("id")} active={sortKey === "id"} dir={sortDir}>ID/tx_hash</Th>
              <Th onClick={() => toggleSort("status")} active={sortKey === "status"} dir={sortDir}>Статус</Th>
              <Th onClick={() => toggleSort("createdAt")} active={sortKey === "createdAt"} dir={sortDir}>Дата</Th>
              <Th onClick={() => toggleSort("amount")} active={sortKey === "amount"} dir={sortDir}>Сумма</Th>
              <Th>Отправитель</Th>
              <Th>Получатель</Th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((t) => (
              <tr key={t.id} className="border-b border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer" onClick={() => onOpen(t)}>
                <td className="px-4 py-3 font-mono">{t.id}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    t.status === "confirmed" ? "text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30" :
                    t.status === "pending" ? "text-amber-700 bg-amber-100 dark:bg-amber-900/30" :
                    "text-red-700 bg-red-100 dark:bg-red-900/30"
                  }`}>
                    {t.status === "confirmed" ? "Подтверждено" : t.status === "pending" ? "В ожидании" : "Отклонено"}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{new Date(t.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 whitespace-nowrap">{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {t.currency}</td>
                <td className="px-4 py-3">{t.sender}</td>
                <td className="px-4 py-3">{t.recipient}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between p-3">
        <div className="text-sm text-neutral-500">Всего: {sorted.length}</div>
        <div className="flex items-center gap-2">
          <select value={size} onChange={(e) => { setSize(parseInt(e.target.value)); setPage(1); }} className="px-2 py-1 rounded border bg-transparent">
            {[10, 20, 50].map((n) => <option key={n} value={n}>{n} / стр</option>)}
          </select>
          <button disabled={page===1} onClick={() => setPage((p) => Math.max(1, p-1))} className="px-3 py-1 rounded border disabled:opacity-50">Назад</button>
          <div className="text-sm">
            {page} / {totalPages}
          </div>
          <button disabled={page===totalPages} onClick={() => setPage((p) => Math.min(totalPages, p+1))} className="px-3 py-1 rounded border disabled:opacity-50">Вперёд</button>
        </div>
      </div>
    </div>
  );
}

function Th({ children, onClick, active, dir }: { children: React.ReactNode; onClick?: () => void; active?: boolean; dir: SortDir }) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold select-none whitespace-nowrap ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1">
        <span>{children}</span>
        {onClick && (
          <span className={`transition-transform ${active ? "opacity-100" : "opacity-40"}`}>
            {dir === "asc" ? "↑" : "↓"}
          </span>
        )}
      </div>
    </th>
  );
}
