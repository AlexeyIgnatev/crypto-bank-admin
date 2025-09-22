"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Transaction } from "../types";

export type SortKey = "createdAt" | "amount" | "status" | "id";
export type SortDir = "asc" | "desc";

export default function Table({ data, onOpen }: { data: Transaction[]; onOpen: (t: Transaction) => void }) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [stickyWidths, setStickyWidths] = useState<number[] | null>(null);

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

  // Lock column widths to avoid layout shifts on filtering/sorting
  const cols = ["id","status","createdAt","amount","sender","recipient"];
  const measure = (root: HTMLElement) => {
    const widths: number[] = [];
    for (let i = 0; i < cols.length; i++) {
      const th = root.querySelector(`th[data-col="${i}"]`) as HTMLElement | null;
      widths.push(th ? th.getBoundingClientRect().width : 0);
    }
  const tableRef = useRef<HTMLTableElement | null>(null);
  useEffect(() => {
    if (tableRef.current) {
      const thead = tableRef.current.querySelector('thead');
      if (thead) measure(thead as HTMLElement);
    }
  }, [sortKey, sortDir, size, page, data.length]);

    setStickyWidths(widths);
  };

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden card">
      {stickyWidths && (
        <style>{`
          .col-0{width:${stickyWidths[0]}px}
          .col-1{width:${stickyWidths[1]}px}
          .col-2{width:${stickyWidths[2]}px}
          .col-3{width:${stickyWidths[3]}px}
          .col-4{width:${stickyWidths[4]}px}
          .col-5{width:${stickyWidths[5]}px}
        `}</style>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 text-white" style={{ background: "var(--primary)" }}>
              {/* Hidden probe row to measure headers once */}
              <tr className="invisible absolute -z-10">
                {cols.map((_, i) => (
                  <th key={i} data-col={i} className={`px-4 py-3 text-left text-xs font-semibold`}>
                    &nbsp;
                  </th>
                ))}
              </tr>

            <tr>
                <Th col={0} onClick={() => toggleSort("id")} active={sortKey === "id"} dir={sortDir}>ID/tx_hash</Th>
                <Th col={1} onClick={() => toggleSort("status")} active={sortKey === "status"} dir={sortDir}>Статус</Th>
                <Th col={2} onClick={() => toggleSort("createdAt")} active={sortKey === "createdAt"} dir={sortDir}>Дата</Th>
                <Th col={3} onClick={() => toggleSort("amount")} active={sortKey === "amount"} dir={sortDir}>Сумма</Th>
                <Th col={4}>Отправитель</Th>
                <Th col={5}>Получатель</Th>
              </tr>
          </thead>
          <tbody>
            {pageData.map((t) => (
              <tr key={t.id} className="border-b border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer" onClick={() => onOpen(t)}>
                <td className="px-4 py-3 font-mono">{t.id}</td>
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

function Th({ children, onClick, active, dir, col }: { children: React.ReactNode; onClick?: () => void; active?: boolean; dir: SortDir; col?: number }) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold select-none whitespace-nowrap ${onClick ? "cursor-pointer" : ""} ${typeof col === 'number' && stickyWidths ? `col-${col}` : ''}`}
      onClick={onClick}
      data-col={typeof col === 'number' ? col : undefined}
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
