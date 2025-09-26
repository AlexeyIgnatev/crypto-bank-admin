"use client";
import { useMemo, useState } from "react";
import { generateAdmins } from "../../lib/mockRepo";
import AdminsTable from "../../components/AdminsTable";
import Modal from "../../components/Modal";
import { Admin } from "../../types";

export default function AdminsPage() {
  const data = useMemo(() => generateAdmins(150), []);
  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [selected, setSelected] = useState<Admin | null>(null);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold">Администраторы</div>
        <button className="btn btn-success" onClick={() => setOpenCreate(true)}>Добавить администратора</button>
      </div>
      <div className="min-h-0 flex-1 flex flex-col">
        <AdminsTable data={data} onOpen={(a) => { setSelected(a); setOpenView(true); }} />
      </div>

      <Modal open={openCreate} onClose={() => setOpenCreate(false)} title="Создать администратора">
        <CreateAdminForm onCancel={() => setOpenCreate(false)} onSave={() => setOpenCreate(false)} />
      </Modal>

      <Modal open={openView} onClose={() => setOpenView(false)} title="Администратор">
        {selected && (
          <AdminDetails admin={selected} onClose={() => setOpenView(false)} />
        )}
      </Modal>
    </div>
  );
}

function CreateAdminForm({ onCancel, onSave }: { onCancel: () => void; onSave: () => void; }) {
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-sm mb-1">Имя</div>
          <input className="ui-input" required placeholder="Имя" />
        </div>
        <div>
          <div className="text-sm mb-1">Фамилия</div>
          <input className="ui-input" required placeholder="Фамилия" />
        </div>
        <div className="col-span-2">
          <div className="text-sm mb-1">Логин (email)</div>
          <input className="ui-input" required type="email" placeholder="email@example.com" />
        </div>
        <div className="col-span-2">
          <div className="text-sm mb-1">Роль</div>
          <select className="ui-input">
            <option>Супер админ</option>
          </select>
        </div>
        <div className="col-span-2">
          <div className="text-sm mb-1">Пароль</div>
          <input className="ui-input" required type="password" placeholder="Пароль" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-4">
        <button type="button" className="btn btn-danger w-full h-9" onClick={onCancel}>Сбросить</button>
        <button type="submit" className="btn btn-success w-full h-9">Сохранить</button>
      </div>
    </form>
  );
}

function AdminDetails({ admin, onClose }: { admin: Admin; onClose: () => void; }) {
  return (
    <div className="space-y-3 text-sm">
      <Row label="Имя" value={admin.firstName} />
      <Row label="Фамилия" value={admin.lastName} />
      <Row label="Логин" value={admin.login} />
      <Row label="Роль" value={admin.role} />
      <Row label="Создано" value={new Date(admin.createdAt).toLocaleString()} />

      <div className="grid grid-cols-3 gap-2 pt-6">
        <button className="btn w-full h-9" onClick={onClose}>Закрыть</button>
        <button className="btn btn-info w-full h-9">Редактировать</button>
        <button className="btn btn-danger w-full h-9">Удалить</button>
      </div>
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
