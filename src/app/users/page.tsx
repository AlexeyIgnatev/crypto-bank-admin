"use client";
import { useState, useEffect } from "react";
import UsersTable from "../../components/UsersTable";
import Modal from "../../components/Modal";
import { User } from "../../types";
import UserDetailsCard from "../../components/UserDetails";
import { createUser, updateUser, deleteUser, getUsers } from "@/lib/api";
import { UserStatus } from "@/types";

export default function UsersPage() {
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // фильтры/сортировки как у администраторов — управляются на странице
  const [filters, setFilters] = useState<{ nameQuery?: string; phoneQuery?: string; emailQuery?: string; statuses?: UserStatus[]; dateFrom?: string; dateTo?: string; minCOM?: number; maxCOM?: number; minTotal?: number; maxTotal?: number }>({});
  const [sort, setSort] = useState<{ key: import("@/components/UsersTable").UserSortKey; dir: import("@/components/UsersTable").SortDir }>({ key: "createdAt", dir: "desc" });

  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  async function fetchPage(pageOffset: number, replace: boolean) {
    setLoading(true);
    try {
      const statuses = (filters.statuses || []).map(s => s === "Активен" ? "ACTIVE" : s === "Заблокирован" ? "BLOCKED" : "FRAUD");
      const res = await getUsers({
        offset: pageOffset,
        limit,
        search: [filters.nameQuery, filters.phoneQuery, filters.emailQuery].filter(Boolean).join(" ") || undefined,
        statuses: statuses.length ? statuses : undefined,
        sortBy: sort.key === "fullName" ? "fio" : sort.key === "phone" ? "phone" : sort.key === "email" ? "email" : sort.key === "status" ? "status" : sort.key === "balanceCOM" ? "som_balance" : sort.key === "balanceTotal" ? "total_balance" : "createdAt",
        sortDir: sort.dir,
      });
      setTotal(res.total ?? (res.items?.length || 0));
      setData(prev => replace ? (res.items || []) : [...prev, ...(res.items || [])]);
    } catch (e) {
      if (replace) { setData([]); setTotal(0); }
      setError("Не удалось загрузить пользователей");
    } finally {
      setLoading(false);
    }
  }

  // первый запрос и обновления при изменении фильтров/сортировок/лимита
  useEffect(() => {
    setData([]); setOffset(0);
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
  const [selected, setSelected] = useState<User | null>(null);
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
            <UsersTable
              data={data}
              onOpen={(u) => { setSelected(u); setOpenView(true); }}
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
          <UserDetailsCard user={selected} onClose={() => setOpenView(false)} onEdit={() => { setOpenView(false); setOpenEdit(true); }} onDelete={() => { setOpenView(false); setOpenDelete(true); }} />
        )}
      </Modal>

      <Modal open={openEdit} onClose={() => setOpenEdit(false)} title="Редактировать пользователя">
        {selected && (
          <EditUserForm user={selected} onCancel={() => setOpenEdit(false)} onSave={() => setOpenEdit(false)} />
        )}
      </Modal>

      <Modal open={openDelete} onClose={() => setOpenDelete(false)} title="Удалить пользователя">
        <DeleteUserConfirm user={selected} onCancel={() => setOpenDelete(false)} onDelete={() => setOpenDelete(false)} />
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

function UserDetails({ user, onClose, onEdit, onDelete }: { user: User; onClose: () => void; onEdit: () => void; onDelete: () => void; }) {
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

      <div className="grid grid-cols-3 gap-2 pt-6">
        <button className="btn w-full h-9" onClick={onClose}>Закрыть</button>
        <button className="btn btn-info w-full h-9" onClick={onEdit}>Редактировать</button>
        <button className="btn btn-danger w-full h-9" onClick={onDelete}>Удалить</button>
      </div>
    </div>
  );
}

function CreateUserForm({ onCancel, onSave }: { onCancel: () => void; onSave: () => void; }) {
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"Активен"|"Заблокирован"|"Фин контроль">("Активен");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault(); setErr(null); setSubmitting(true);
      try {
        await createUser({ firstName, lastName, middleName, phone, email, status });
        onSave();
      } catch {
        setErr("Не удалось создать пользователя");
      } finally {
        setSubmitting(false);
      }
    }}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-sm mb-1">Фамилия</div>
          <input className="ui-input w-full" required placeholder="Фамилия" value={lastName} onChange={e=>setLastName(e.target.value)} />
        </div>
        <div>
          <div className="text-sm mb-1">Имя</div>
          <input className="ui-input w-full" required placeholder="Имя" value={firstName} onChange={e=>setFirstName(e.target.value)} />
        </div>
        <div className="col-span-2">
          <div className="text-sm mb-1">Отчество</div>
          <input className="ui-input w-full" placeholder="(необязательно)" value={middleName} onChange={e=>setMiddleName(e.target.value)} />
        </div>
        <div>
          <div className="text-sm mb-1">Телефон</div>
          <input className="ui-input w-full" required placeholder="+996 (...) ... ..." value={phone} onChange={e=>setPhone(e.target.value)} />
        </div>
        <div>
          <div className="text-sm mb-1">E-mail</div>
          <input className="ui-input w-full" required placeholder="email@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div className="col-span-2">
          <div className="text-sm mb-1">Статус</div>
          <select className="ui-input" value={status} onChange={e=>setStatus(e.target.value as any)}>
            <option>Активен</option>
            <option>Заблокирован</option>
            <option>Фин контроль</option>
          </select>
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

function EditUserForm({ user, onCancel, onSave }: { user: User; onCancel: () => void; onSave: () => void; }) {
  const [lastName, setLastName] = useState(user.fullName.split(" ")[0] || "");
  const [firstName, setFirstName] = useState(user.fullName.split(" ")[1] || "");
  const [middleName, setMiddleName] = useState(user.fullName.split(" ")[2] || "");
  const [phone, setPhone] = useState(user.phone);
  const [email, setEmail] = useState(user.email);
  const [status, setStatus] = useState(user.status);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault(); setErr(null); setSubmitting(true);
      try {
        await updateUser(user.id, { firstName, lastName, middleName, phone, email, status });
        onSave();
      } catch {
        setErr("Не удалось сохранить пользователя");
      } finally {
        setSubmitting(false);
      }
    }}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-sm mb-1">Фамилия</div>
          <input className="ui-input w-full" value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="Фамилия" />
        </div>
        <div>
          <div className="text-sm mb-1">Имя</div>
          <input className="ui-input w-full" value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="Имя" />
        </div>
        <div className="col-span-2">
          <div className="text-sm mb-1">Отчество</div>
          <input className="ui-input w-full" value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder="(необязательно)" />
        </div>
        <div>
          <div className="text-sm mb-1">Телефон</div>
          <input className="ui-input w-full" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+996 (...) ... ..." />
        </div>
        <div>
          <div className="text-sm mb-1">E-mail</div>
          <input className="ui-input w-full" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="email@example.com" />
        </div>
        <div className="col-span-2">
          <div className="text-sm mb-1">Статус</div>
          <select className="ui-input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option>Активен</option>
            <option>Заблокирован</option>
            <option>Фин контроль</option>
          </select>
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

function DeleteUserConfirm({ user, onCancel, onDelete }: { user: User | null; onCancel: () => void; onDelete: () => void; }) {
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="space-y-4 text-sm">
      <div>
        Вы уверены, что хотите удалить пользователя «{user ? user.fullName : ""}»?
      </div>
      {err && <div className="text-sm text-red-500">{err}</div>}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <button className="btn w-full h-9" onClick={onCancel}>Отмена</button>
        <button className="btn btn-danger w-full h-9" disabled={submitting} onClick={async ()=>{
          if (!user) return;
          setErr(null); setSubmitting(true);
          try { await deleteUser(user.id); onDelete(); } catch(e){ setErr("Не удалось удалить пользователя"); } finally { setSubmitting(false); }
        }}>Удалить</button>
      </div>
    </div>
  );
}
