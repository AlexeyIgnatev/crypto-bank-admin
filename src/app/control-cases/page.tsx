"use client";
import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import { formatAmount6 } from "@/lib/format";

// Р›РѕРєР°Р»СЊРЅС‹Рµ С‚РёРїС‹ РґР»СЏ РєРµР№СЃРѕРІ С„РёРЅРєРѕРЅС‚СЂРѕР»СЏ (РЅРµ РІРјРµС€РёРІР°РµРјСЃСЏ РІ РѕР±С‰РёР№ TransactionStatus)
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
  const text = status === "APPROVED" ? "РџРѕРґС‚РІРµСЂР¶РґРµРЅРѕ" : status === "OPEN" ? "РќР° СЂР°СЃСЃРјРѕС‚СЂРµРЅРёРё" : "РћС‚РєР»РѕРЅРµРЅРѕ";
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
      setRefreshToken(t => t + 1); // РѕР±РЅРѕРІРёРј С‚Р°Р±Р»РёС†Сѓ РІ С„РѕРЅРµ
    } finally {
      setConfirm({ open: false, action: null });
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
      <div className="flex-1 min-h-0">
        <CasesTable onOpen={openDetails} refreshToken={refreshToken} />
      </div>

      {/* РњРѕРґР°Р»РєР° РґРµС‚Р°Р»РµР№ РєРµР№СЃР° */}
      <Modal open={open} onClose={closeDetails} title="РРЅС„РѕСЂРјР°С†РёСЏ Рѕ С‚СЂР°РЅР·Р°РєС†РёРё">
        {selected && (
          <div className="space-y-3 text-sm text-fg">
            <Row label="ID/tx_hash" value={<span className="font-mono">{selected.id}</span>} />
            <Row label="РЎС‚Р°С‚СѓСЃ" value={<div className="flex items-center gap-2">{statusBadge(selected.status)}</div>} />
            <Row label="Р”Р°С‚Р°" value={new Date(selected.createdAt).toLocaleString()} />


            {/* Р–С‘Р»С‚С‹Р№ Р±Р»РѕРє СЃ РїСЂРёС‡РёРЅРѕР№ РїСЂРёРѕСЃС‚Р°РЅРѕРІРєРё */}
            <Row label="РЎСѓРјРјР°" value={`${formatAmount6(selected.amount)} ${selected.currency}`} />
            <Row label="РћС‚РїСЂР°РІРёС‚РµР»СЊ" value={selected.sender} />
            <Row label="РџРѕР»СѓС‡Р°С‚РµР»СЊ" value={selected.recipient} />
            {selected.status === "OPEN" && (
              <div className="pt-2 grid grid-cols-2 gap-2">
                <button className="btn btn-success h-9" onClick={() => setConfirm({ open: true, action: "approve" })}>РџРѕРґС‚РІРµСЂРґРёС‚СЊ</button>
                <button className="btn btn-danger h-9" onClick={() => setConfirm({ open: true, action: "reject" })}>РћС‚РєР»РѕРЅРёС‚СЊ</button>
              </div>
            )}
            {selected.status === "REJECTED" && (
              <div className="pt-2">
                <button className="btn btn-success h-9 w-full" onClick={() => setConfirm({ open: true, action: "approve" })}>{"\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c"}</button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* РџРѕРїР°Рї РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ РґРµР№СЃС‚РІРёСЏ */}
      <Modal open={confirm.open} onClose={() => setConfirm({ open: false, action: null })} title={confirm.action === "approve" ? "РџРѕРґС‚РІРµСЂРґРёС‚СЊ РѕРїРµСЂР°С†РёСЋ?" : confirm.action === "reject" ? "РћС‚РєР»РѕРЅРёС‚СЊ РѕРїРµСЂР°С†РёСЋ?" : ""}>
        <div className="space-y-3">
          <div className="text-sm text-muted">Р­С‚Рѕ РґРµР№СЃС‚РІРёРµ РёР·РјРµРЅРёС‚ СЃС‚Р°С‚СѓСЃ С‚СЂР°РЅР·Р°РєС†РёРё Рё РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ РѕС‚РјРµРЅРµРЅРѕ.</div>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn h-9" onClick={() => setConfirm({ open: false, action: null })}>РћС‚РјРµРЅР°</button>

            <button className={`btn h-9 ${confirm.action === "approve" ? "btn-success" : "btn-danger"}`} onClick={() => doChangeStatus(confirm.action as any)}>
              {confirm.action === "approve" ? "РџРѕРґС‚РІРµСЂРґРёС‚СЊ" : "РћС‚РєР»РѕРЅРёС‚СЊ"}
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

