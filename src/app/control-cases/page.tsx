"use client";
import { useMemo, useState } from "react";
import Modal from "@/components/Modal";

// Локальные типы для кейсов финконтроля (не вмешиваемся в общий TransactionStatus)
type ControlCaseStatus = "OPEN" | "APPROVED" | "REJECTED";
interface ControlCase {
  id: string;
  status: ControlCaseStatus;
  createdAt: string;
  amount: number;
  currency: string;
  sender: string;
  recipient: string;
}

function statusBadge(status: ControlCaseStatus) {
  const cls = status === "APPROVED" ? "badge-success" : status === "OPEN" ? "badge-warning" : "badge-danger";
  const text = status === "APPROVED" ? "Подтверждено" : status === "OPEN" ? "На рассмотрении" : "Отклонено";
  return <span className={`badge ${cls}`}>{text}</span>;
}

import { useEffect } from "react";
import { getAntifraudCases, approveAntifraudCase, rejectAntifraudCase } from "@/lib/api";

export default function ControlCasesPage() {
  const [items, setItems] = useState<ControlCase[]>([]);
  const [selected, setSelected] = useState<ControlCase | null>(null);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ open: boolean; action: "approve"|"reject"|null }>({ open: false, action: null });

  const total = items.length;

  useEffect(() => {
    (async () => {
      try {
        const res = await getAntifraudCases({ limit: 50, sortBy: "createdAt", sortDir: "desc" });
        const mapped: ControlCase[] = res.items.map(it => ({
          id: it.id,
          status: it.status,
          createdAt: it.createdAt,
          amount: it.amount,
          currency: it.currency,
          sender: it.sender,
          recipient: it.recipient,
        }));
        setItems(mapped);
      } catch {
        setItems([]);
      }
    })();
  }, []);

  function openDetails(t: ControlCase) { setSelected(t); setOpen(true); }
  function closeDetails() { setOpen(false); }

  async function doChangeStatus(action: "approve"|"reject") {
    if (!selected) return;
    try {
      if (action === "approve") await approveAntifraudCase(selected.id);
      else await rejectAntifraudCase(selected.id);
      const nextStatus: ControlCaseStatus = action === "approve" ? "APPROVED" : "REJECTED";
      setItems(prev => prev.map(it => it.id === selected.id ? { ...it, status: nextStatus } : it));
      setSelected(s => s ? { ...s, status: nextStatus } : s);
    } finally {
      setConfirm({ open: false, action: null });
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
      <div className="shrink-0 rounded-xl border border-soft card">
        <div className="flex items-center justify-between px-4 py-2 text-sm" style={{ background: "var(--primary)", color: "#fff", borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
          <div>Загружено {items.length} из {total}</div>
          <div className="opacity-90">Список кейсов фин. контроля</div>
        </div>
        <div className="p-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[72px]" />
                <col className="w-[240px]" />
                <col className="w-[140px]" />
                <col className="w-[160px]" />
                <col className="w-[120px]" />
                <col />
                <col />
              </colgroup>
              <thead>
                <tr className="text-xs text-muted">
                  <th className="px-4 py-3 text-left">№</th>
                  <th className="px-4 py-3 text-left">ID/tx_hash</th>
                  <th className="px-4 py-3 text-left">Статус</th>
                  <th className="px-4 py-3 text-left">Дата</th>
                  <th className="px-4 py-3 text-left">Сумма</th>
                  <th className="px-4 py-3 text-left">Отправитель</th>
                  <th className="px-4 py-3 text-left">Получатель</th>
                </tr>
              </thead>
              <tbody>
                {items.map((t, i) => (
                  <tr key={t.id} className="border-t border-soft hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer" onClick={() => openDetails(t)}>
                    <td className="px-4 py-3 tabular-nums text-muted">{i + 1}</td>
                    <td className="px-4 py-3 font-mono truncate" title={t.id}>{t.id}</td>
                    <td className="px-4 py-3">{statusBadge(t.status)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {t.currency}</td>
                    <td className="px-4 py-3 truncate" title={t.sender}>{t.sender}</td>
                    <td className="px-4 py-3 truncate" title={t.recipient}>{t.recipient}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td className="px-4 py-8 text-center text-muted" colSpan={7}>Нет данных</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Модалка деталей кейса */}
      <Modal open={open} onClose={closeDetails} title="Информация о транзакции">
        {selected && (
          <div className="space-y-3 text-sm text-fg">
            <Row label="ID/tx_hash" value={<span className="font-mono">{selected.id}</span>} />
            <Row label="Статус" value={<div className="flex items-center gap-2">{statusBadge(selected.status)}</div>} />
            <Row label="Дата" value={new Date(selected.createdAt).toLocaleString()} />
            <Row label="Сумма" value={`${selected.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${selected.currency}`} />
            <Row label="Отправитель" value={selected.sender} />
            <Row label="Получатель" value={selected.recipient} />
            {selected.status === "OPEN" && (
              <div className="pt-2 grid grid-cols-2 gap-2">
                <button className="btn btn-success h-9" onClick={() => setConfirm({ open: true, action: "approve" })}>Подтвердить</button>
                <button className="btn btn-danger h-9" onClick={() => setConfirm({ open: true, action: "reject" })}>Отклонить</button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Попап подтверждения действия */}
      <Modal open={confirm.open} onClose={() => setConfirm({ open: false, action: null })} title={confirm.action === "approve" ? "Подтвердить операцию?" : confirm.action === "reject" ? "Отклонить операцию?" : ""}>
        <div className="space-y-3">
          <div className="text-sm text-muted">Это действие изменит статус транзакции и не может быть отменено.</div>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn h-9" onClick={() => setConfirm({ open: false, action: null })}>Отмена</button>
            <button className={`btn h-9 ${confirm.action === "approve" ? "btn-success" : "btn-danger"}`} onClick={() => doChangeStatus(confirm.action as any)}>
              {confirm.action === "approve" ? "Подтвердить" : "Отклонить"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 items-center">
      <div className="text-muted">{label}</div>
      <div className="col-span-2 min-w-0">{value}</div>
    </div>
  );
}
