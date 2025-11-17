"use client";
import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import { formatAmount6 } from "@/lib/format";

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
  const [refreshToken, setRefreshToken] = useState(0);

  function openDetails(t: AntiFraudCaseItem) { setSelected(t); setOpen(true); }
  function closeDetails() { setOpen(false); }

  async function doChangeStatus(action: "approve"|"reject") {
    if (!selected) return;
    try {
      if (action === "approve") await approveAntifraudCase(selected.id);
      else await rejectAntifraudCase(selected.id);
      setSelected(s => s ? { ...s, status: action === "approve" ? "APPROVED" : "REJECTED" } : s);
      setRefreshToken(t => t + 1); // обновим таблицу в фоне
    } finally {
      setConfirm({ open: false, action: null });
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
      <div className="flex-1 min-h-0">
        <CasesTable onOpen={openDetails} refreshToken={refreshToken} />
      </div>

      {/* Модалка деталей кейса */}
      <Modal open={open} onClose={closeDetails} title="Информация о транзакции">
        {selected && (
          <div className="space-y-3 text-sm text-fg">
            <Row label="ID/tx_hash" value={<span className="font-mono">{selected.id}</span>} />
            <Row label="Статус" value={<div className="flex items-center gap-2">{statusBadge(selected.status)}</div>} />
            <Row label="Дата" value={new Date(selected.createdAt).toLocaleString()} />


            {/* Жёлтый блок с причиной приостановки */}
            <ReasonBlock selected={selected} />

            <Row label="Сумма" value={`${formatAmount6(selected.amount)} ${selected.currency}`} />
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

function ReasonBlock({ selected }: { selected: AntiFraudCaseItem }) {
  const ruleKey = selected.ruleKey || "";
  const reasonText = typeof selected.reason === "string" ? selected.reason : (selected.reason ? JSON.stringify(selected.reason, null, 2) : "");

  const keyToCategory: Record<string, "Обязательный контроль" | "Поведение клиента"> = {
    FIAT_ANY_GE_1M: "Обязательный контроль",
    ONE_TIME_GE_8M: "Обязательный контроль",
    FREQUENT_OPS_3_30D_EACH_GE_100K: "Поведение клиента",
    WITHDRAW_AFTER_LARGE_INFLOW: "Поведение клиента",
    SPLITTING_TOTAL_14D_GE_1M: "Поведение клиента",
    THIRD_PARTY_DEPOSITS_3_30D_TOTAL_GE_1M: "Поведение клиента",
    AFTER_INACTIVITY_6M: "Поведение клиента",
    MANY_SENDERS_TO_ONE_10_PER_MONTH: "Поведение клиента",
  };
  const keyToSensor: Record<string, string> = {
    FIAT_ANY_GE_1M: "Операция с фиатом ≥ 1 000 000 сом",
    ONE_TIME_GE_8M: "Разовая сделка ≥ 2 800 000 сом",
    FREQUENT_OPS_3_30D_EACH_GE_100K: "≥ 3 операции за 30 дней, каждая ≥ 100 000 сом",
    WITHDRAW_AFTER_LARGE_INFLOW: "Вывод в фиат после крупного поступления",
    SPLITTING_TOTAL_14D_GE_1M: "Дробление сумм с фиата: за 14 дней ≥ 1 000 000 сом",
    THIRD_PARTY_DEPOSITS_3_30D_TOTAL_GE_1M: "Внесение третьими лицами: ≥ 3 за 30 дней, общая сумма ≥ 1 000 000 сом",
    AFTER_INACTIVITY_6M: "Активность счёта после неактивности ≥ 6 мес.",
    MANY_SENDERS_TO_ONE_10_PER_MONTH: "Переводы от ≥ 10 физлиц на один счёт за месяц",
  };

  const category = keyToCategory[ruleKey] || "";
  const sensor = keyToSensor[ruleKey] || "";
  if (!ruleKey && !reasonText) return null;

  return (
    <div className="rounded-xl bg-amber-100/90 text-black p-4 border border-amber-200 mt-1">
      <div className="font-medium mb-2">Причина приостановки</div>
      <div className="grid grid-cols-3 gap-3 items-start">
        <div className="text-muted">Сработавший триггер</div>
        <div className="col-span-2 min-w-0 font-semibold">{category || "—"}</div>
        <div className="text-muted">Датчик</div>
        <div className="col-span-2 min-w-0">{sensor || ruleKey || "—"}</div>
        <div className="text-muted">Описание</div>
        <div className="col-span-2 min-w-0 whitespace-pre-wrap">{reasonText || "—"}</div>
      </div>
    </div>
  );
}