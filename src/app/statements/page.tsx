"use client";

import { useState } from "react";
import { getTransactions } from "@/lib/api";
import { Transaction } from "@/types";

const ASSET_OPTIONS = [
  { label: "САЛАМ", value: "SALAM" },
  { label: "ETH", value: "ETH" },
  { label: "USDT", value: "USDT" },
  { label: "BTC", value: "BTC" },
];

const MOCK_CUSTOMER_ID = "2566678";

const MOCK_STATEMENT_ITEMS: Transaction[] = [
  {
    id: "mock-salam-001",
    status: "SUCCESS",
    createdAt: "2026-06-06T09:12:20.000Z",
    amount: 1250,
    feeAmount: 0,
    currency: "SALAM",
    kind: "CONVERSION",
    comment: "Конвертация СОМ -> САЛАМ",
    sender: "Клиент #2566678",
    recipient: "Кошелек САЛАМ 0xE95d...6527",
    senderCustomerId: MOCK_CUSTOMER_ID,
    recipientCustomerId: MOCK_CUSTOMER_ID,
  },
  {
    id: "mock-salam-002",
    status: "REJECTED",
    createdAt: "2026-06-05T14:45:10.000Z",
    amount: 500,
    feeAmount: 0,
    currency: "SALAM",
    kind: "WALLET_TO_WALLET",
    comment: "Отклонено финконтролем: превышен лимит операций",
    sender: "Клиент #2566678",
    recipient: "Клиент #2566681",
    senderCustomerId: MOCK_CUSTOMER_ID,
    recipientCustomerId: "2566681",
  },
  {
    id: "mock-eth-001",
    status: "SUCCESS",
    createdAt: "2026-06-04T11:30:00.000Z",
    amount: 0.025,
    feeAmount: 0.0007,
    currency: "ETH",
    kind: "CONVERSION",
    comment: "Конвертация САЛАМ -> ETH",
    sender: "Клиент #2566678",
    recipient: "0xE95d8FD6C2658F8eB10664a9aF40881ef17c6527",
    senderCustomerId: MOCK_CUSTOMER_ID,
  },
  {
    id: "mock-usdt-001",
    status: "SUCCESS",
    createdAt: "2026-06-03T08:05:42.000Z",
    amount: 75.5,
    feeAmount: 1,
    currency: "USDT",
    kind: "WITHDRAW_CRYPTO",
    comment: "Вывод USDT TRC20",
    sender: "Клиент #2566678",
    recipient: "TC4LpLCSmDycoRuakLJb4cpzfgLJGX8YBS",
    senderCustomerId: MOCK_CUSTOMER_ID,
  },
  {
    id: "mock-btc-001",
    status: "FAILED",
    createdAt: "2026-06-02T16:18:33.000Z",
    amount: 0.00032,
    feeAmount: 0.00001,
    currency: "BTC",
    kind: "WITHDRAW_CRYPTO",
    comment: "Недостаточно средств с учетом комиссии",
    sender: "Клиент #2566678",
    recipient: "bc1qz9k5sh7q80akh8npjq6wsftch0lyptsr0qehzf",
    senderCustomerId: MOCK_CUSTOMER_ID,
  },
];

function mockItemsForAsset(asset: string) {
  return MOCK_STATEMENT_ITEMS
    .filter((item) => item.currency === asset)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export default function StatementsPage() {
  const [customerId, setCustomerId] = useState(MOCK_CUSTOMER_ID);
  const [asset, setAsset] = useState<string>("SALAM");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Transaction[]>(() => mockItemsForAsset("SALAM"));

  function loadMock(nextAsset = asset) {
    setCustomerId(MOCK_CUSTOMER_ID);
    setError(null);
    setItems(mockItemsForAsset(nextAsset));
  }

  async function load() {
    const id = customerId.trim();
    if (!id) {
      setError("Укажите ID клиента");
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
            <select className="ui-input w-full" value={asset} onChange={(e) => {
              const nextAsset = e.target.value;
              setAsset(nextAsset);
              loadMock(nextAsset);
            }}>
              {ASSET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <button className="btn btn-primary h-10 px-5" onClick={load} disabled={loading}>
              {loading ? "Загрузка..." : "Показать выписку"}
            </button>
            <button className="btn h-10 px-5" onClick={() => loadMock()} disabled={loading}>
              Показать мок-данные
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
                <th className="text-left px-3 py-2">Отправитель</th>
                <th className="text-left px-3 py-2">Получатель</th>
                <th className="text-left px-3 py-2">Причина отклонения</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => {
                const rejectionReason = (t.status === "FAILED" || t.status === "REJECTED") ? (t.comment || "—") : "—";
                return (
                  <tr key={t.id} className="border-b border-soft">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2">{t.id}</td>
                    <td className="px-3 py-2">{t.status}</td>
                    <td className="px-3 py-2">{t.currency}</td>
                    <td className="px-3 py-2 text-right">{t.amount.toLocaleString()}</td>
                    <td className="px-3 py-2">{t.sender}</td>
                    <td className="px-3 py-2">{t.recipient}</td>
                    <td className="px-3 py-2">{rejectionReason}</td>
                  </tr>
                );
              })}
              {!loading && items.length === 0 && (
                <tr>
                  <td className="px-3 py-8 text-center text-muted" colSpan={8}>Нет данных</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
