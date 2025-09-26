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
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

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
          <AdminDetails admin={selected} onClose={() => setOpenView(false)} onEdit={() => { setOpenView(false); setOpenEdit(true); }} onDelete={() => { setOpenView(false); setOpenDelete(true); }} />
        )}
      </Modal>

      <Modal open={openEdit} onClose={() => setOpenEdit(false)} title="Редактировать администратора">
        {selected && (
          <EditAdminForm admin={selected} onCancel={() => setOpenEdit(false)} onSave={() => setOpenEdit(false)} />
        )}
      </Modal>

      <Modal open={openDelete} onClose={() => setOpenDelete(false)} title="Удалить администратора">
        <DeleteAdminConfirm admin={selected} onCancel={() => setOpenDelete(false)} onDelete={() => setOpenDelete(false)} />
      </Modal>

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

function AdminDetails({ admin, onClose, onEdit, onDelete }: { admin: Admin; onClose: () => void; onEdit: () => void; onDelete: () => void; }) {
  return (
    <div className="space-y-3 text-sm">
      <Row label="Имя" value={admin.firstName} />
      <Row label="Фамилия" value={admin.lastName} />
      <Row label="Логин" value={admin.login} />
      <Row label="Роль" value={admin.role} />
      <Row label="Создано" value={new Date(admin.createdAt).toLocaleString()} />

      <div className="grid grid-cols-3 gap-2 pt-6">
        <button className="btn w-full h-9" onClick={onClose}>Закрыть</button>
        <button className="btn btn-info w-full h-9" onClick={onEdit}>Редактировать</button>
        <button className="btn btn-danger w-full h-9" onClick={onDelete}>Удалить</button>
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
function EditAdminForm({ admin, onCancel, onSave }: { admin: Admin; onCancel: () => void; onSave: () => void; }) {
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-sm mb-1">Имя</div>
          <input className="ui-input" defaultValue={admin.firstName} required placeholder="Имя" />
        </div>
        <div>
          <div className="text-sm mb-1">Фамилия</div>
          <input className="ui-input" defaultValue={admin.lastName} required placeholder="Фамилия" />
        </div>
        <div className="col-span-2">
          <div className="text-sm mb-1">Логин (email)</div>
          <input className="ui-input" defaultValue={admin.login} required type="email" placeholder="email@example.com" />
        </div>
        <div className="col-span-2">
          <div className="text-sm mb-1">Роль</div>
          <select className="ui-input" defaultValue={admin.role}>
            <option>Супер админ</option>
          </select>
        </div>
        <div className="col-span-2">
          <div className="text-sm mb-1">Пароль</div>
          <input className="ui-input" type="password" placeholder="Оставьте пустым чтобы не менять" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-4">
        <button type="button" className="btn w-full h-9" onClick={onCancel}>Отмена</button>
        <button type="submit" className="btn btn-success w-full h-9">Сохранить</button>
      </div>
    </form>
  );
}

function DeleteAdminConfirm({ admin, onCancel, onDelete }: { admin: Admin | null; onCancel: () => void; onDelete: () => void; }) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        Вы уверены, что хотите удалить администратора «{admin ? admin.firstName + " " + admin.lastName : ""}»?
      </div>
      <div className="grid grid-cols-2 gap-2 pt-2">
        <button className="btn w-full h-9" onClick={onCancel}>Отмена</button>
        <button className="btn btn-danger w-full h-9" onClick={onDelete}>Удалить</button>
      </div>
    </div>
  );
}

    </div>
  );
}
