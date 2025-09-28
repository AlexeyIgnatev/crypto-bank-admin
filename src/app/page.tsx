"use client";
import Cards from "../components/Cards";
import Table from "../components/Table";
import Modal from "../components/Modal";
import { useMemo, useState } from "react";
import { generateTransactions, generateUsers } from "../lib/mockRepo";
import { Transaction, User } from "../types";
import UserDetailsCard from "../components/UserDetails";

export default function Home() {
  const data = useMemo(() => generateTransactions(250), []);
  const users = useMemo(() => generateUsers(600), []);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [openUser, setOpenUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  function openUserModalByName(name: string) {
    // Сначала ищем точное совпадение среди сгенерированных пользователей
    let u = users.find(u => u.fullName === name);
    // Если не нашли (моки имён транзакций могут отличаться), пробуем частичное совпадение по первым словам
    if (!u) {
      const part = name.split(" ").slice(0, 2).join(" ").toLowerCase();
      u = users.find(x => x.fullName.toLowerCase().includes(part));
    }
    // Если всё равно нет — создаём заглушку с этим именем
    if (!u) {
      u = {
        id: "tmp-" + Math.random().toString(36).slice(2, 8),
        fullName: name,
        phone: "+996 (555) 000 000",
        email: "unknown@example.com",
        status: "Активен",
        balances: { COM: 0, SALAM: 0, BTC: 0, ETH: 0, USDT: 0 },
        createdAt: new Date().toISOString(),
      };
    }
    setSelectedUser(u);
    setOpenUser(true);
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
      <div className="shrink-0"><Cards /></div>
      <div className="min-h-0 flex-1 flex flex-col"><Table
        data={data}
        onOpen={(t) => { setSelected(t); setOpen(true); }}
      /></div>
      <Modal open={open} onClose={() => setOpen(false)} title="Детали транзакции">
        {selected && (
          <div className="space-y-2 text-sm text-fg">
            <Row label="ID/tx_hash" value={selected.id} mono />
            <Row label="Статус" value={selected.status} />
            <Row label="Дата" value={new Date(selected.createdAt).toLocaleString()} />
            <Row label="Сумма" value={`${selected.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${selected.currency}`} />
            <Row label="Отправитель" value={
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate" title={selected.sender}>{selected.sender}</span>
                <button
                  className="btn btn-info h-7 w-7 p-0 rounded-full ml-auto shrink-0"
                  onClick={() => openUserModalByName(selected.sender)}
                  aria-label="Открыть профиль"
                  title="Открыть профиль"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 110-8 4 4 0 010 8z" fill="none" stroke="#fff" strokeWidth="2"/><path d="M4 20c0-3.5 3.8-5.5 8-5.5s8 2 8 5.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>
            } />
            <Row label="Получатель" value={
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate" title={selected.recipient}>{selected.recipient}</span>
                <button
                  className="btn btn-info h-7 w-7 p-0 rounded-full ml-auto shrink-0"
                  onClick={() => openUserModalByName(selected.recipient)}
                  aria-label="Открыть профиль"
                  title="Открыть профиль"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 110-8 4 4 0 010 8z" fill="none" stroke="#fff" strokeWidth="2"/><path d="M4 20c0-3.5 3.8-5.5 8-5.5s8 2 8 5.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>
            } />
          </div>
        )}
      </Modal>

      <Modal open={openUser} onClose={() => setOpenUser(false)} title="Пользователь">
        {selectedUser && (
          <UserDetailsCard user={selectedUser} onClose={() => setOpenUser(false)} onEdit={() => setOpenUser(false)} onDelete={() => setOpenUser(false)} />
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="text-muted">{label}</div>
      <div className={`col-span-2 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
