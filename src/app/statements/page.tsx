"use client";

import { useState } from "react";
import { getTransactions } from "@/lib/api";
import { readableRejectionReason } from "@/lib/rejectionReason";
import { Transaction } from "@/types";

const ASSET_OPTIONS = [
  { label: "САЛАМ", value: "SALAM" },
  { label: "USDT TRC20", value: "USDT" },
];

function asNumber(value: number | undefined): number {
  return Number(value ?? 0);
}

export default function StatementsPage() {
  const [customerId, setCustomerId] = useState("");
  const [asset, setAsset] = useState<string>("SALAM");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Transaction[]>([]);

  async function load() {
    const id = customerId.trim();
    if (!id) {
      setError("Укажите ID клиента");
      setItems([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [sent, received] = await Promise.all([
        getTransactions({
          sender: id,
          limit: 200,
          offset: 0,
          sortBy: "createdAt",
          sortDir: "desc",
          currencies: [asset],
        }),
        getTransactions({
          receiver: id,
          limit: 200,
          offset: 0,
          sortBy: "createdAt",
          sortDir: "desc",
          currencies: [asset],
        }),
      ]);

      const merged = [...sent.items, ...received.items];
      const uniq = new Map<string, Transaction>();
      for (const tx of merged) uniq.set(tx.id, tx);
      const sorted = Array.from(uniq.values()).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      setItems(sorted);
    } catch {
      setError("Не удалось загрузить выписку");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
      <div className="card rounded-xl border border-soft p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <div className="text-sm mb-1">ID клиента</div>
            <input className="ui-input w-full" value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="Например: 2566678" />
          </div>
          <div>
            <div className="text-sm mb-1">Актив</div>
            <select className="ui-input w-full" value={asset} onChange={(e) => setAsset(e.target.value)}>
              {ASSET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <button className="btn btn-primary h-10 px-5" onClick={load} disabled={loading}>
              {loading ? "Загрузка..." : "Показать выписку"}
            </button>
          </div>
        </div>
        {error && <div className="text-sm text-red-500 mt-3">{error}</div>}
      </div>

      <div className="card rounded-xl border border-soft overflow-hidden min-h-0 flex flex-col">
        <div className="p-3 border-b border-soft text-sm text-muted">Операции: {items.length}</div>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--card)] z-10">
              <tr className="border-b border-soft">
                <th className="text-left px-3 py-2">Дата</th>
                <th className="text-left px-3 py-2">Tx / ID</th>
                <th className="text-left px-3 py-2">Статус</th>
                <th className="text-left px-3 py-2">Актив</th>
                <th className="text-right px-3 py-2">Сумма</th>
                <th className="text-right px-3 py-2">Комиссия банка</th>
                <th className="text-right px-3 py-2">Сетевая комиссия</th>
                <th className="text-right px-3 py-2">Газ (energy)</th>
                <th className="text-right px-3 py-2">Двигающая сила</th>
                <th className="text-right px-3 py-2">Сожжено BRICS</th>
                <th className="text-left px-3 py-2">Отправитель</th>
                <th className="text-left px-3 py-2">Получатель</th>
                <th className="text-left px-3 py-2">Причина отклонения</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => {
                const rejectionReason = readableRejectionReason(t);
                return (
                  <tr key={t.id} className="border-b border-soft">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2">{t.id}</td>
                    <td className="px-3 py-2">{t.status}</td>
                    <td className="px-3 py-2">{t.currency}</td>
                    <td className="px-3 py-2 text-right">{t.amount.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{Number(t.feeAmount || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">
                      {`${asNumber(t.networkFeeAmount).toLocaleString()} ${t.networkFeeAsset || ""}`.trim()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {asNumber(t.energyUsed).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {asNumber(t.bandwidthUsed).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {asNumber(t.bricsBurnedAmount).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">{t.sender}</td>
                    <td className="px-3 py-2">{t.recipient}</td>
                    <td className="px-3 py-2">{rejectionReason}</td>
                  </tr>
                );
              })}
              {!loading && items.length === 0 && (
                <tr>
                  <td className="px-3 py-8 text-center text-muted" colSpan={13}>Нет данных</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
