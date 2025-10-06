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

import CasesTable from "@/components/CasesTable";
import { approveAntifraudCase, rejectAntifraudCase, type AntiFraudCaseItem } from "@/lib/api";

export default function ControlCasesPage() {
  const [selected, setSelected] = useState<AntiFraudCaseItem | null>(null);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ open: boolean; action: "approve"|"reject"|null }>({ open: false, action: null });

  function openDetails(t: AntiFraudCaseItem) { setSelected(t); setOpen(true); }
  function closeDetails() { setOpen(false); }

  async function doChangeStatus(action: "approve"|"reject") {
    if (!selected) return;
    try {
      if (action === "approve") await approveAntifraudCase(selected.id);
      else await rejectAntifraudCase(selected.id);
      setSelected(s => s ? { ...s, status: action === "approve" ? "APPROVED" : "REJECTED" } : s);
    } finally {
      setConfirm({ open: false, action: null });
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
      <div className="flex-1 min-h-0">
        <CasesTable onOpen={openDetails} />
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
