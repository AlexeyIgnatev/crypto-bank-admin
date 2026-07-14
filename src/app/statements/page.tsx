"use client";

import { useEffect, useMemo, useState } from "react";
import { getTransactions } from "@/lib/api";
import { exportRows } from "@/lib/exporters";
import { readableRejectionReason } from "@/lib/rejectionReason";
import { Transaction } from "@/types";

const ASSET_OPTIONS = [
  { label: "СОМ", value: "SOM" },
  { label: "САЛАМ", value: "SALAM" },
  { label: "USDT TRC20", value: "USDT" },
] as const;

const EXPORT_PAGE_SIZE = 200;

function asNumber(value: number | undefined): number {
  return Number(value ?? 0);
}

function txLabel(t: Transaction) {
  return t.kind ? `${t.kind} · ${t.id}` : t.id;
}

async function fetchAllByRole(params: {
  search: string;
  asset: string;
  role: "sender" | "receiver";
}): Promise<Transaction[]> {
  const items: Transaction[] = [];
  let offset = 0;
  while (true) {
    const res = await getTransactions({
      [params.role]: params.search,
      offset,
      limit: EXPORT_PAGE_SIZE,
      sortBy: "createdAt",
      sortDir: "desc",
      currencies: [params.asset],
    } as any);
    items.push(...res.items);
    if (res.items.length < EXPORT_PAGE_SIZE) break;
    offset += EXPORT_PAGE_SIZE;
    if (offset > 5000) break;
  }
  return items;
}

export default function StatementsPage() {
  const [search, setSearch] = useState("");
  const [asset, setAsset] = useState<string>("SALAM");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"all-pdf" | "all-csv" | "all-txt" | "selected-pdf" | "selected-csv" | "selected-txt" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Transaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds],
  );

  useEffect(() => {
    setSelectedIds(new Set());
  }, [items]);

  async function load() {
    const term = search.trim();
    if (!term) {
      setError("Укажите фамилию, имя, телефон или кошелёк");
      setItems([]);
      setSelectedIds(new Set());
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [sent, received] = await Promise.all([
        fetchAllByRole({ search: term, asset, role: "sender" }),
        fetchAllByRole({ search: term, asset, role: "receiver" }),
      ]);

      const uniq = new Map<string, Transaction>();
      for (const tx of [...sent, ...received]) uniq.set(tx.id, tx);
      const sorted = Array.from(uniq.values()).sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      );
      setItems(sorted);
      setSelectedIds(new Set());
      if (!sorted.length) {
        setError("По этому запросу ничего не найдено");
      }
    } catch {
      setError("Не удалось загрузить выписку");
      setItems([]);
      setSelectedIds(new Set());
    } finally {
      setLoading(false);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((prev) => {
      if (items.length && prev.size === items.length) return new Set();
      return new Set(items.map((item) => item.id));
    });
  }

  async function exportTransactions(
    rows: Transaction[],
    format: "pdf" | "csv" | "txt",
    fileBaseName: string,
  ) {
    if (!rows.length) return;
    await exportRows({
      format,
      fileBaseName,
      title: "Выписка по операциям",
      periodLabel: `Выборка: ${search.trim()} · ${asset}`,
      columns: [
        { header: "Дата", getValue: (row) => new Date(row.createdAt).toLocaleString() },
        { header: "Tx / ID", getValue: (row) => row.id },
        { header: "Статус", getValue: (row) => row.status },
        { header: "Актив", getValue: (row) => row.currency },
        { header: "Сумма", getValue: (row) => row.amount },
        { header: "Комиссия банка", getValue: (row) => row.feeAmount ?? 0 },
        {
          header: "Сетевая комиссия",
          getValue: (row) => `${asNumber(row.networkFeeAmount)} ${row.networkFeeAsset || ""}`.trim(),
        },
        { header: "Газ (energy)", getValue: (row) => asNumber(row.energyUsed) },
        { header: "Двигающая сила", getValue: (row) => asNumber(row.bandwidthUsed) },
        { header: "Сожжено BRICS", getValue: (row) => asNumber(row.bricsBurnedAmount) },
        { header: "Отправитель", getValue: (row) => row.sender },
        { header: "Получатель", getValue: (row) => row.recipient },
        { header: "Причина отклонения", getValue: (row) => readableRejectionReason(row) },
      ],
      rows,
    });
  }

  async function exportAll(format: "pdf" | "csv" | "txt") {
    if (!items.length) return;
    setExporting(`all-${format}`);
    try {
      await exportTransactions(items, format, `statements_all_${asset}`);
    } finally {
      setExporting(null);
    }
  }

  async function exportSelected(format: "pdf" | "csv" | "txt") {
    if (!selectedItems.length) return;
    setExporting(`selected-${format}`);
    try {
      await exportTransactions(selectedItems, format, `statements_selected_${asset}`);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="card rounded-xl border border-soft p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.6fr_0.9fr_auto] md:items-end">
          <label className="grid gap-1">
            <div className="text-sm mb-1">Поиск по ФИО / телефону / кошельку</div>
            <input
              className="ui-input w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Например: Иванов, +996..., TRVh3..."
            />
          </label>
          <label className="grid gap-1">
            <div className="text-sm mb-1">Актив</div>
            <select
              className="ui-input w-full"
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
            >
              {ASSET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary h-10 px-5" onClick={load} disabled={loading}>
            {loading ? "Загрузка..." : "Показать выписку"}
          </button>
        </div>
        {error && <div className="mt-3 text-sm text-red-500">{error}</div>}
      </div>

      <div className="card flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-soft p-3 text-sm text-muted">
          <div>Операции: {items.length}</div>
          <div>Выбрано: {selectedItems.length}</div>
          <div className="flex flex-wrap gap-2">
            <button className="btn h-9 px-3" onClick={toggleAllVisible} disabled={!items.length}>
              {selectedIds.size === items.length && items.length ? "Снять выбор" : "Выбрать все"}
            </button>
            <div className="flex flex-wrap gap-2">
              <button className="btn h-9 px-3" onClick={() => exportAll("pdf")} disabled={!items.length || exporting !== null}>
                {exporting === "all-pdf" ? "PDF..." : "Экспорт выборки PDF"}
              </button>
              <button className="btn h-9 px-3" onClick={() => exportAll("csv")} disabled={!items.length || exporting !== null}>
                {exporting === "all-csv" ? "CSV..." : "Экспорт выборки CSV"}
              </button>
              <button className="btn h-9 px-3" onClick={() => exportAll("txt")} disabled={!items.length || exporting !== null}>
                {exporting === "all-txt" ? "TXT..." : "Экспорт выборки TXT"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn h-9 px-3" onClick={() => exportSelected("pdf")} disabled={!selectedItems.length || exporting !== null}>
                {exporting === "selected-pdf" ? "PDF..." : "Выбранные PDF"}
              </button>
              <button className="btn h-9 px-3" onClick={() => exportSelected("csv")} disabled={!selectedItems.length || exporting !== null}>
                {exporting === "selected-csv" ? "CSV..." : "Выбранные CSV"}
              </button>
              <button className="btn h-9 px-3" onClick={() => exportSelected("txt")} disabled={!selectedItems.length || exporting !== null}>
                {exporting === "selected-txt" ? "TXT..." : "Выбранные TXT"}
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--card)]">
              <tr className="border-b border-soft">
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedIds.size === items.length}
                    onChange={toggleAllVisible}
                  />
                </th>
                <th className="px-3 py-2 text-left">Дата</th>
                <th className="px-3 py-2 text-left">Tx / ID</th>
                <th className="px-3 py-2 text-left">Статус</th>
                <th className="px-3 py-2 text-left">Актив</th>
                <th className="px-3 py-2 text-right">Сумма</th>
                <th className="px-3 py-2 text-right">Комиссия банка</th>
                <th className="px-3 py-2 text-right">Сетевая комиссия</th>
                <th className="px-3 py-2 text-right">Газ (energy)</th>
                <th className="px-3 py-2 text-right">Двигающая сила</th>
                <th className="px-3 py-2 text-right">Сожжено BRICS</th>
                <th className="px-3 py-2 text-left">Отправитель</th>
                <th className="px-3 py-2 text-left">Получатель</th>
                <th className="px-3 py-2 text-left">Причина отклонения</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => {
                const rejectionReason = readableRejectionReason(t);
                return (
                  <tr key={t.id} className="border-b border-soft">
                    <td className="px-3 py-2 align-top">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(t.id)}
                        onChange={() => toggleSelected(t.id)}
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2 break-all">{txLabel(t)}</td>
                    <td className="px-3 py-2">{t.status}</td>
                    <td className="px-3 py-2">{t.currency}</td>
                    <td className="px-3 py-2 text-right">{t.amount.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{Number(t.feeAmount || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">
                      {`${asNumber(t.networkFeeAmount).toLocaleString()} ${t.networkFeeAsset || ""}`.trim()}
                    </td>
                    <td className="px-3 py-2 text-right">{asNumber(t.energyUsed).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{asNumber(t.bandwidthUsed).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{asNumber(t.bricsBurnedAmount).toLocaleString()}</td>
                    <td className="px-3 py-2 break-words">{t.sender}</td>
                    <td className="px-3 py-2 break-words">{t.recipient}</td>
                    <td className="px-3 py-2 break-words">{rejectionReason}</td>
                  </tr>
                );
              })}
              {!loading && items.length === 0 && (
                <tr>
                  <td className="px-3 py-8 text-center text-muted" colSpan={15}>
                    Нет данных
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
