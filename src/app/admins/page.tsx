"use client";
import { useEffect, useState } from "react";
import AdminsTable, { AdminSortKey, SortDir } from "../../components/AdminsTable";
import Modal from "../../components/Modal";
import { Admin } from "../../types";
import { getAdmins, createAdmin, updateAdmin, deleteAdmin } from "@/lib/api";

export default function AdminsPage() {
  const [data, setData] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Параметры фильтрации/сортировки (можно связать с UI позже)
  // Фильтры и сортировка для бэкенда
  const [filters, setFilters] = useState<{ firstNameQuery?: string; lastNameQuery?: string; emailQuery?: string; roles?: string[]; createdFrom?: string; createdTo?: string }>({});
  const [sort, setSort] = useState<{ key: AdminSortKey; dir: SortDir }>({ key: "createdAt", dir: "desc" });

  // Пагинация
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  async function fetchPage(pageOffset: number, replace: boolean) {
    setLoading(true);
    try {
      const res = await getAdmins({
        offset: pageOffset,
        limit,
        firstNameQuery: filters.firstNameQuery,
        lastNameQuery: filters.lastNameQuery,
        emailQuery: filters.emailQuery,
        roles: filters.roles,
        createdFrom: filters.createdFrom,
        createdTo: filters.createdTo,
        sortFirstName: sort.key === "firstName" ? sort.dir : undefined,
        sortLastName: sort.key === "lastName" ? sort.dir : undefined,
        sortEmail: sort.key === "login" ? sort.dir : undefined,
        sortCreatedAt: sort.key === "createdAt" ? sort.dir : undefined,
      });
      setTotal(res.total ?? (res.items?.length || 0));
      setData(prev => replace ? (res.items || []) : [...prev, ...(res.items || [])]);
    } catch (e) {
      if (replace) { setData([]); setTotal(0); }
      setError("Не удалось загрузить администраторов");
    } finally {
      setLoading(false);
    }
  }

  // Первый запрос и обновление при изменении фильтров/сортировок/лимита
  useEffect(() => {
    setData([]);
    setOffset(0);
    fetchPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, JSON.stringify(filters), sort.key, sort.dir]);

  const canNext = offset + data.length < total;
  const onEndReached = () => {
    if (loading || !canNext) return;
    const nextOffset = offset + data.length;
    setOffset(nextOffset);
    fetchPage(nextOffset, false);
  };

  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [selected, setSelected] = useState<Admin | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">

      <div className="min-h-0 flex-1 flex flex-col">
        {loading ? (
          <div className="m-auto text-muted">Загрузка...</div>
        ) : error ? (
          <div className="m-auto text-red-500">{error}</div>
        ) : (
          <div className="flex-1 min-h-0" onScroll={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            const nearEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 200;
            if (nearEnd) onEndReached();
          }}>
            <AdminsTable
              data={data}
              onOpen={(a) => { setSelected(a); setOpenView(true); }}
              filters={filters}
              onChangeFilters={(patch) => setFilters(prev => ({ ...prev, ...patch }))}
              sort={sort}
              onChangeSort={(key, dir) => setSort({ key, dir })}
            />
          </div>
        )}
      </div>

      <button
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg flex items-center justify-center text-xl bg-[var(--primary)] text-white hover:opacity-90"
        onClick={() => setOpenCreate(true)}
        aria-label="Добавить администратора"
        title="Добавить администратора"
      >
        +
      </button>

      <Modal open={openCreate} onClose={() => setOpenCreate(false)} title="Создать администратора">
        <CreateAdminForm onCancel={() => setOpenCreate(false)} onSave={() => { setOpenCreate(false); reload(); }} />
      </Modal>

      <Modal open={openView} onClose={() => setOpenView(false)} title="Администратор">
        {selected && (
          <AdminDetails admin={selected} onClose={() => setOpenView(false)} onEdit={() => { setOpenView(false); setOpenEdit(true); }} onDelete={() => { setOpenView(false); setOpenDelete(true); }} />
        )}
      </Modal>

      <Modal open={openEdit} onClose={() => setOpenEdit(false)} title="Редактировать администратора">
        {selected && (
          <EditAdminForm admin={selected} onCancel={() => setOpenEdit(false)} onSave={() => { setOpenEdit(false); reload(); }} />
        )}
      </Modal>

      <Modal open={openDelete} onClose={() => setOpenDelete(false)} title="Удалить администратора">
        <DeleteAdminConfirm admin={selected} onCancel={() => setOpenDelete(false)} onDelete={() => { setOpenDelete(false); reload(); }} />
      </Modal>

          
    </div>
  );
}

function CreateAdminForm({ onCancel, onSave }: { onCancel: () => void; onSave: () => void; }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState("Супер админ");

  const [err, setErr] = useState<string | null>(null);
  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      setErr(null);
      setSubmitting(true);
      try {
        await createAdmin({ email, password, firstName, lastName, role });
        onSave();
      } catch (e) {
        setErr("Не удалось создать администратора");
      } finally {
        setSubmitting(false);
      }
    }}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-sm mb-1">Имя</div>
          <input className="ui-input" required placeholder="Имя" value={firstName} onChange={(e)=>setFirstName(e.target.value)} />
        </div>
        <div>
          <div className="text-sm mb-1">Фамилия</div>
          <input className="ui-input" required placeholder="Фамилия" value={lastName} onChange={(e)=>setLastName(e.target.value)} />
        </div>
        <div className="col-span-2">
          <div className="text-sm mb-1">Логин (email)</div>
          <input className="ui-input" required type="email" placeholder="email@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} />
        </div>
        <div className="col-span-2">
          <div className="text-sm mb-1">Роль</div>
          <select className="ui-input" value={role} onChange={(e)=>setRole(e.target.value)}>
            <option>Супер админ</option>
            <option>СКК</option>
            <option>УДБО</option>
            <option>УБУИО</option>
            <option>Казначейство</option>
            <option>УИТ</option>
          </select>
        </div>
        <div className="col-span-2">
          <div className="text-sm mb-1">Пароль</div>
          <input className="ui-input" required type="password" placeholder="Пароль" value={password} onChange={(e)=>setPassword(e.target.value)} />
        </div>
      </div>
      {err && <div className="text-sm text-red-500">{err}</div>}
      <div className="grid grid-cols-2 gap-2 pt-4">
        <button type="button" className="btn btn-danger w-full h-9" onClick={onCancel}>Сбросить</button>
        <button type="submit" className="btn btn-success w-full h-9" disabled={submitting}>{submitting?"Сохранение...":"Сохранить"}</button>
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
  const [firstName, setFirstName] = useState(admin.firstName);
  const [lastName, setLastName] = useState(admin.lastName);
  const [email, setEmail] = useState(admin.login);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState(admin.role || "Супер админ");
  const [err, setErr] = useState<string | null>(null);
  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      setErr(null);
      setSubmitting(true);
      try {
        const p: any = { firstName, lastName, email, role };
        if (password) p.password = password;
        await updateAdmin(admin.id, p);
        onSave();
      } catch (e) {
        setErr("Не удалось сохранить администратора");
      } finally {
        setSubmitting(false);
      }
    }}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-sm mb-1">Имя</div>
          <input className="ui-input" value={firstName} onChange={(e)=>setFirstName(e.target.value)} required placeholder="Имя" />
        </div>
        <div>
          <div className="text-sm mb-1">Фамилия</div>
          <input className="ui-input" value={lastName} onChange={(e)=>setLastName(e.target.value)} required placeholder="Фамилия" />
        </div>
        <div className="col-span-2">
          <div className="text-sm mb-1">Логин (email)</div>
          <input className="ui-input" value={email} onChange={(e)=>setEmail(e.target.value)} required type="email" placeholder="email@example.com" />
        </div>
        <div className="col-span-2">
          <div className="text-sm mb-1">Роль</div>
          <select className="ui-input" value={role} onChange={(e)=>setRole(e.target.value)}>
            <option>Супер админ</option>
            <option>СКК</option>
            <option>УДБО</option>
            <option>УБУИО</option>
            <option>Казначейство</option>
            <option>УИТ</option>
          </select>
        </div>
        <div className="col-span-2">
          <div className="text-sm mb-1">Пароль</div>
          <input className="ui-input" type="password" placeholder="Оставьте пустым чтобы не менять" value={password} onChange={(e)=>setPassword(e.target.value)} />
        </div>
      </div>
      {err && <div className="text-sm text-red-500">{err}</div>}
      <div className="grid grid-cols-2 gap-2 pt-4">
        <button type="button" className="btn w-full h-9" onClick={onCancel}>Отмена</button>
        <button type="submit" className="btn btn-success w-full h-9" disabled={submitting}>{submitting?"Сохранение...":"Сохранить"}</button>
      </div>
    </form>
  );
}

function DeleteAdminConfirm({ admin, onCancel, onDelete }: { admin: Admin | null; onCancel: () => void; onDelete: () => void; }) {
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="space-y-4 text-sm">
      <div>
        Вы уверены, что хотите удалить администратора «{admin ? admin.firstName + " " + admin.lastName : ""}»?
      </div>
      {err && <div className="text-sm text-red-500">{err}</div>}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <button className="btn w-full h-9" onClick={onCancel}>Отмена</button>
        <button className="btn btn-danger w-full h-9" disabled={submitting} onClick={async ()=>{
          if (!admin) return;
          setErr(null); setSubmitting(true);
          try { await deleteAdmin(admin.id); onDelete(); } catch(e){ setErr("Не удалось удалить администратора"); } finally { setSubmitting(false); }
        }}>Удалить</button>
      </div>
    </div>
  );
}
