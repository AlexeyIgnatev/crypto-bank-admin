"use client";
import { useMemo, useState } from "react";
import UsersTable from "../../components/UsersTable";
import Modal from "../../components/Modal";
import { User } from "../../types";
import { generateUsers } from "../../lib/mockRepo";

export default function UsersPage() {
  const data = useMemo(() => generateUsers(400), []);
  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [selected, setSelected] = useState<User | null>(null);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
      <div className="min-h-0 flex-1 flex flex-col">
        <UsersTable data={data} onOpen={(u) => { setSelected(u); setOpenView(true); }} />
      </div>

      <button
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg flex items-center justify-center text-xl bg-[var(--primary)] text-white hover:opacity-90"
        onClick={() => setOpenCreate(true)}
        aria-label="Добавить пользователя"
        title="Добавить пользователя"
      >
        +
      </button>

      <Modal open={openCreate} onClose={() => setOpenCreate(false)} title="Создать пользователя">
        <CreateUserForm onCancel={() => setOpenCreate(false)} onSave={() => setOpenCreate(false)} />
      </Modal>

      <Modal open={openView} onClose={() => setOpenView(false)} title="Пользователь">
        {selected && (
          <UserDetails user={selected} onClose={() => setOpenView(false)} />
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="text-muted">{label}</div>
      <div className="col-span-2">{value}</div>
    </div>
  );
}

function UserDetails({ user, onClose }: { user: User; onClose: () => void }) {
  const total = user.balances.COM + user.balances.SALAM + user.balances.BTC + user.balances.ETH + user.balances.USDT;
  return (
    <div className="space-y-3 text-sm">
      <Row label="ФИО" value={user.fullName} />
      <Row label="Телефон" value={user.phone} />
      <Row label="E-mail" value={user.email} />
      <Row label="Статус" value={user.status} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="text-muted">Балансы</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>COM</div><div className="text-right">{user.balances.COM.toLocaleString()}</div>
            <div>SALAM</div><div className="text-right">{user.balances.SALAM.toLocaleString()}</div>
            <div>BTC</div><div className="text-right">{user.balances.BTC.toLocaleString()}</div>
            <div>ETH</div><div className="text-right">{user.balances.ETH.toLocaleString()}</div>
            <div>USDT</div><div className="text-right">{user.balances.USDT.toLocaleString()}</div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-muted">Итоги</div>
          <div className="flex justify-between"><span>Баланс СОМ</span><span>{user.balances.COM.toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Общий баланс</span><span>{total.toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Создан</span><span>{new Date(user.createdAt).toLocaleString()}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 pt-6">
        <button className="btn w-full h-9" onClick={onClose}>Закрыть</button>
      </div>
    </div>
  );
}

function CreateUserForm({ onCancel, onSave }: { onCancel: () => void; onSave: () => void; }) {
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <div className="text-sm mb-1">ФИО</div>
          <input className="ui-input w-full" required placeholder="ФИО" />
        </div>
        <div>
          <div className="text-sm mb-1">Телефон</div>
          <input className="ui-input w-full" required placeholder="+996 (...) ... ..." />
        </div>
        <div>
          <div className="text-sm mb-1">E-mail</div>
          <input className="ui-input w-full" required placeholder="email@example.com" />
        </div>
        <div className="col-span-2">
          <div className="text-sm mb-1">Статус</div>
          <select className="ui-input">
            <option>Активен</option>
            <option>Заблокирован</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-4">
        <button type="button" className="btn btn-danger w-full h-9" onClick={onCancel}>Сбросить</button>
        <button type="submit" className="btn btn-success w-full h-9">Сохранить</button>
      </div>
    </form>
  );
}
