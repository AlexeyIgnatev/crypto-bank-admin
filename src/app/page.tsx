"use client";
/* eslint-disable react/jsx-key */

import Cards from "../components/Cards";
import Table from "../components/Table";
import Modal from "../components/Modal";
import UserDetails from "../components/UserDetails";
import { useState, useEffect, useRef } from "react";
import { formatAmount6 } from "@/lib/format";
import { Transaction, User, TransactionStatus } from "../types";
import { getUserById } from "@/lib/api";

export default function Home() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Transaction | null>(null);

  const [openUser, setOpenUser] = useState(false);
  const [openUserEdit, setOpenUserEdit] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  async function openUserModalById(id: string) {
    try {
      const user = await getUserById(id);
      setSelectedUser(user);
      setOpenUser(true);
    } catch (_e) {
      // Если пользователь не найден — просто не открываем модалку
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
      <div className="shrink-0"><Cards /></div>
      <div className="min-h-0 flex-1 flex flex-col"><Table
        onOpen={(t) => { setSelected(t); setOpen(true); }}
      /></div>
      <Modal open={open} onClose={() => setOpen(false)} title="Детали транзакции">
        {selected && (
          <div className="space-y-2 text-sm text-fg">
            <Row label="ID/tx_hash" value={selected.id} mono />
            <Row label="Статус" value={<StatusBadge status={selected.status} />} />
            <Row label="Дата" value={new Date(selected.createdAt).toLocaleString()} />
            <Row label="Сумма" value={`${formatAmount6(selected.amount)} ${selected.currency}`} />
            <Row label="Отправитель" value={
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate" title={selected.sender}>{selected.sender}</span>
                {selected.senderCustomerId && (
                  <button
                    className="inline-flex items-center justify-center h-7 w-7 rounded-full ml-auto shrink-0 bg-blue-600 hover:bg-blue-500"
                    onClick={() => openUserModalById(String(selected.senderCustomerId))}
                    aria-label="Открыть профиль"
                    title="Открыть профиль"
                  >
                    <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true" className="pointer-events-none">
                      <path fill="#fff" fillRule="evenodd" d="M10 8a3 3 0 100-6 3 3 0 000 6zM3 14a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            } />
            <Row label="Получатель" value={
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate" title={selected.recipient}>{selected.recipient}</span>
                {selected.recipientCustomerId && (
                  <button
                    className="inline-flex items-center justify-center h-7 w-7 rounded-full ml-auto shrink-0 bg-blue-600 hover:bg-blue-500"
                    onClick={() => openUserModalById(String(selected.recipientCustomerId))}
                    aria-label="Открыть профиль"
                    title="Открыть профиль"
                  >
                    <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true" className="pointer-events-none">
                      <path fill="#fff" fillRule="evenodd" d="M10 8a3 3 0 100-6 3 3 0 000 6zM3 14a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            } />
          </div>
        )}
      </Modal>
      <Modal open={openUser} onClose={() => setOpenUser(false)} title="Пользователь">
        {selectedUser && (
          <UserDetails user={selectedUser} onClose={() => setOpenUser(false)} onEdit={() => { setOpenUser(false); setOpenUserEdit(true); }} onDelete={() => setOpenUser(false)} />
        )}
      </Modal>

      <Modal open={openUserEdit} onClose={() => setOpenUserEdit(false)} title="Редактировать пользователя">
        {selectedUser && (
          <EditUserInline user={selectedUser} onCancel={() => setOpenUserEdit(false)} onSave={(next) => { setSelectedUser(next); setOpenUserEdit(false); }} />
        )}
      </Modal>
    </div>
  );
}

function EditUserInline({ user, onCancel, onSave }: { user: User; onCancel: () => void; onSave: (u: User) => void; }) {
  const [lastName, setLastName] = useState(user.fullName.split(" ")[0] || "");
  const [firstName, setFirstName] = useState(user.fullName.split(" ")[1] || "");
  const [middleName, setMiddleName] = useState(user.fullName.split(" ")[2] || "");
  const [phone, setPhone] = useState(user.phone);
  const [email, setEmail] = useState(user.email);
  const [status, setStatus] = useState(user.status);

  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSave({ ...user, fullName: [lastName, firstName, middleName].filter(Boolean).join(" "), phone, email, status }); }}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-sm mb-1">Фамилия</div>
          <input className="ui-input w-full" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
        <div>
          <div className="text-sm mb-1">Имя</div>
          <input className="ui-input w-full" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div className="col-span-2">
          <div className="text-sm mb-1">Отчество</div>
          <input className="ui-input w-full" value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder="(необязательно)" />
        </div>
        <div>
          <div className="text-sm mb-1">Телефон</div>
          <input className="ui-input w-full" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
        <div>
          <div className="text-sm mb-1">E-mail</div>
          <input className="ui-input w-full" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </div>
        <div className="col-span-2">
          <div className="text-sm mb-1">Статус</div>
          <select className="ui-input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option>Активен</option>
            <option>Заблокирован</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-4">
        <button type="button" className="btn w-full h-9" onClick={onCancel}>Отмена</button>
        <button type="submit" className="btn btn-success w-full h-9">Сохранить</button>
      </div>
    </form>
  );
}


function StatusBadge({ status }: { status: TransactionStatus }) {
  const cls = status === "SUCCESS" ? "badge-success" : status === "PENDING" ? "badge-warning" : status === "REJECTED" ? "badge-danger" : "badge-danger";
  const text = status === "SUCCESS" ? "Успешно" : status === "PENDING" ? "В ожидании" : status === "REJECTED" ? "Отклонено" : "Ошибка";
  return <span className={`badge ${cls} whitespace-nowrap`}>{text}</span>;
}

export function Row({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-3 items-center">
      <div className="text-muted">{label}</div>
      <div className={`col-span-2 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
function StatusEditor({ tx, onSave }: { tx: Transaction; onSave: (t: Transaction) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<TransactionStatus>(tx.status);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setValue(tx.status), [tx.status]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!(e.target instanceof Node)) return;
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const dirty = value !== tx.status;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="relative inline-flex items-center gap-2">
        <button
          ref={btnRef}
          className="inline-flex items-center gap-1.5 pl-0 pr-2 h-8 rounded-lg bg-transparent max-w-[220px]"
          onClick={() => setOpen(o => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <StatusBadge status={value} />
          <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 7l5 5 5-5H5z" fill="currentColor"/></svg>
        </button>
        {open && (
          <div ref={panelRef} className="absolute z-50 top-full left-0 mt-1 card border border-soft rounded-lg shadow-xl p-2 w-[220px]">
            <div className="space-y-1">
              {(["confirmed","pending","declined"] as TransactionStatus[]).map(s => (
                <button key={s} className={`w-full text-left px-2 py-2 rounded transition-colors duration-150 hover:bg-slate-100 dark:hover:bg-white/10 ${value===s?"bg-black/5 dark:bg-white/10":""}`}
                  onClick={() => { setValue(s); setOpen(false); }}>
                  <StatusBadge status={s} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {dirty && (
        <button
          className="inline-flex items-center justify-center h-7 w-7 rounded-full ml-auto shrink-0 bg-blue-600 hover:bg-blue-500"
          onClick={() => { onSave({ ...tx, status: value }); setOpen(false); }}
          title="Сохранить"
          aria-label="Сохранить"
        >
          <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true" className="pointer-events-none">
            <path fill="#fff" fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}
