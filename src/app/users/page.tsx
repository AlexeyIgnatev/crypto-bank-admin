"use client";

import { useEffect, useState } from "react";
import UsersTable from "../../components/UsersTable";
import Modal from "../../components/Modal";
import UserDetailsCard from "../../components/UserDetails";
import { exportRows, type ExportFormat } from "@/lib/exporters";
import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
} from "@/lib/api";
import {
  CustomerResidency,
  TariffCategory,
  User,
  UserStatus,
} from "@/types";

function mapUiStatuses(statuses?: UserStatus[]) {
  return (statuses || []).map((status) =>
    status === "Активен"
      ? "ACTIVE"
      : status === "Заблокирован"
        ? "BLOCKED"
        : "FRAUD",
  );
}

type UsersFilters = {
  nameQuery?: string;
  phoneQuery?: string;
  emailQuery?: string;
  statuses?: UserStatus[];
  dateFrom?: string;
  dateTo?: string;
  minCOM?: number;
  maxCOM?: number;
  minTotal?: number;
  maxTotal?: number;
};

export default function UsersPage() {
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UsersFilters>({});
  const [sort, setSort] = useState<{
    key: import("@/components/UsersTable").UserSortKey;
    dir: import("@/components/UsersTable").SortDir;
  }>({ key: "createdAt", dir: "desc" });
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [selected, setSelected] = useState<User | null>(null);

  async function loadAllUsers(): Promise<User[]> {
    const pageLimit = 200;
    let pageOffset = 0;
    const all: User[] = [];
    const statuses = mapUiStatuses(filters.statuses);

    for (;;) {
      const res = await getUsers({
        offset: pageOffset,
        limit: pageLimit,
        search:
          [filters.nameQuery, filters.phoneQuery, filters.emailQuery]
            .filter(Boolean)
            .join(" ") || undefined,
        statuses: statuses.length ? statuses : undefined,
        sortBy:
          sort.key === "fullName"
            ? "fio"
            : sort.key === "phone"
              ? "phone"
              : sort.key === "email"
                ? "email"
                : sort.key === "status"
                  ? "status"
                  : sort.key === "balanceCOM"
                    ? "som_balance"
                    : sort.key === "balanceTotal"
                      ? "total_balance"
                      : sort.key === "lastLoginAt"
                        ? "last_login_at"
                        : "createdAt",
        sortDir: sort.dir,
      });

      const pageItems = res.items || [];
      all.push(...pageItems);
      pageOffset += pageItems.length;

      if (pageItems.length === 0 || all.length >= (res.total ?? 0)) {
        break;
      }
    }

    return all;
  }

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const all = await loadAllUsers();
      setData(all);
      setTotal(all.length);
    } catch {
      setData([]);
      setTotal(0);
      setError("Не удалось загрузить пользователей");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setData([]);
    void fetchUsers();
  }, [JSON.stringify(filters), sort.key, sort.dir]);

  async function onExportUsers(format: ExportFormat) {
    if (exporting) return;
    setExporting(format);
    try {
      const rows = await loadAllUsers();
      const activeCount = rows.filter((user) => user.status === "Активен").length;

      await exportRows<User>({
        format,
        fileBaseName: "clients_registry",
        title: "Список клиентов",
        summary: [
          { label: "Всего клиентов", value: rows.length },
          { label: "Активных", value: activeCount },
        ],
        columns: [
          { header: "№", getValue: (_row, index) => index + 1 },
          {
            header: "ID клиента ABS",
            getValue: (row) => row.absClientId || row.id,
          },
          { header: "ФИО", getValue: (row) => row.fullName || "—" },
          { header: "Телефон", getValue: (row) => row.phone || "—" },
          { header: "E-mail", getValue: (row) => row.email || "—" },
          { header: "Статус", getValue: (row) => row.status },
          {
            header: "Последний логин",
            getValue: (row) =>
              row.lastLoginAt
                ? new Date(row.lastLoginAt).toLocaleString()
                : "—",
          },
          { header: "COM", getValue: (row) => row.balances.COM },
          { header: "SALAM", getValue: (row) => row.balances.SALAM },
          { header: "USDT TRC20", getValue: (row) => row.balances.USDT },
        ],
        rows,
      });
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
      <div className="shrink-0 flex items-center justify-end gap-2">
        <button
          className="btn h-9"
          disabled={!!exporting}
          onClick={() => onExportUsers("excel")}
        >
          {exporting === "excel" ? "Выгрузка..." : "Excel"}
        </button>
        <button
          className="btn h-9"
          disabled={!!exporting}
          onClick={() => onExportUsers("pdf")}
        >
          {exporting === "pdf" ? "Выгрузка..." : "PDF"}
        </button>
        <button
          className="btn h-9"
          disabled={!!exporting}
          onClick={() => onExportUsers("txt")}
        >
          {exporting === "txt" ? "Выгрузка..." : "TXT"}
        </button>
      </div>

      <div className="min-h-0 flex-1 flex flex-col">
        {loading ? (
          <div className="m-auto text-muted">Загрузка...</div>
        ) : error ? (
          <div className="m-auto text-red-500">{error}</div>
        ) : (
          <div className="flex-1 min-h-0">
            <UsersTable
              data={data}
              onOpen={(user) => {
                setSelected(user);
                setOpenView(true);
              }}
              filters={filters}
              onChangeFilters={(patch) =>
                setFilters((prev) => ({ ...prev, ...patch }))
              }
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

      <Modal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="Создать пользователя"
      >
        <CreateUserForm
          onCancel={() => setOpenCreate(false)}
          onSave={async () => {
            setOpenCreate(false);
            await fetchUsers();
          }}
        />
      </Modal>

      <Modal
        open={openView}
        onClose={() => setOpenView(false)}
        title="Пользователь"
      >
        {selected && (
          <UserDetailsCard
            user={selected}
            onClose={() => setOpenView(false)}
            onEdit={() => {
              setOpenView(false);
              setOpenEdit(true);
            }}
            onDelete={() => {
              setOpenView(false);
              setOpenDelete(true);
            }}
          />
        )}
      </Modal>

      <Modal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        title="Редактировать пользователя"
      >
        {selected && (
          <EditUserForm
            user={selected}
            onCancel={() => setOpenEdit(false)}
            onSave={async (next) => {
              setData((prev) =>
                prev.map((user) =>
                  user.id === selected.id ? { ...user, ...next } : user,
                ),
              );
              setSelected((prev) =>
                prev && prev.id === selected.id ? { ...prev, ...next } : prev,
              );
              setOpenEdit(false);
              await fetchUsers();
            }}
          />
        )}
      </Modal>

      <Modal
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        title="Удалить пользователя"
      >
        <DeleteUserConfirm
          user={selected}
          onCancel={() => setOpenDelete(false)}
          onDelete={async () => {
            setOpenDelete(false);
            await fetchUsers();
          }}
        />
      </Modal>
    </div>
  );
}

function CreateUserForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: () => Promise<void> | void;
}) {
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<UserStatus>("Активен");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setErr(null);
        setSubmitting(true);
        try {
          await createUser({
            firstName,
            lastName,
            middleName,
            phone,
            email,
            status,
          });
          await onSave();
        } catch (error: any) {
          setErr(error?.message || "Не удалось создать пользователя");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <UserFormFields
        lastName={lastName}
        firstName={firstName}
        middleName={middleName}
        phone={phone}
        email={email}
        status={status}
        tariffCategory="K1"
        residency="RESIDENT"
        onLastName={setLastName}
        onFirstName={setFirstName}
        onMiddleName={setMiddleName}
        onPhone={setPhone}
        onEmail={setEmail}
        onStatus={setStatus}
      />
      {err && <div className="text-sm text-red-500">{err}</div>}
      <div className="grid grid-cols-2 gap-2 pt-4">
        <button
          type="button"
          className="btn btn-danger w-full h-9"
          onClick={onCancel}
        >
          Сбросить
        </button>
        <button
          type="submit"
          className="btn btn-success w-full h-9"
          disabled={submitting}
        >
          {submitting ? "Сохранение..." : "Сохранить"}
        </button>
      </div>
    </form>
  );
}

function EditUserForm({
  user,
  onCancel,
  onSave,
}: {
  user: User;
  onCancel: () => void;
  onSave: (
    next: Pick<
      User,
      "fullName" | "phone" | "email" | "status" | "tariffCategory" | "residency"
    >,
  ) => Promise<void> | void;
}) {
  const [lastName, setLastName] = useState(user.fullName.split(" ")[0] || "");
  const [firstName, setFirstName] = useState(user.fullName.split(" ")[1] || "");
  const [middleName, setMiddleName] = useState(
    user.fullName.split(" ")[2] || "",
  );
  const [phone, setPhone] = useState(user.phone);
  const [email, setEmail] = useState(user.email);
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [tariffCategory, setTariffCategory] = useState<TariffCategory>(
    user.tariffCategory || "K1",
  );
  const [residency, setResidency] = useState<CustomerResidency>(
    user.residency || "RESIDENT",
  );
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setErr(null);
        setSubmitting(true);
        try {
          await updateUser(user.id, {
            firstName,
            lastName,
            middleName,
            phone,
            email,
            status,
            tariffCategory,
            residency,
          });

          await onSave({
            fullName: [lastName, firstName, middleName].filter(Boolean).join(" "),
            phone,
            email,
            status,
            tariffCategory,
            residency,
          });
        } catch (error: any) {
          setErr(error?.message || "Не удалось сохранить пользователя");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <UserFormFields
        lastName={lastName}
        firstName={firstName}
        middleName={middleName}
        phone={phone}
        email={email}
        status={status}
        tariffCategory={tariffCategory}
        residency={residency}
        onLastName={setLastName}
        onFirstName={setFirstName}
        onMiddleName={setMiddleName}
        onPhone={setPhone}
        onEmail={setEmail}
        onStatus={setStatus}
        onTariffCategory={setTariffCategory}
        onResidency={setResidency}
        showTariff
      />
      {err && <div className="text-sm text-red-500">{err}</div>}
      <div className="grid grid-cols-2 gap-2 pt-4">
        <button type="button" className="btn w-full h-9" onClick={onCancel}>
          Отмена
        </button>
        <button
          type="submit"
          className="btn btn-success w-full h-9"
          disabled={submitting}
        >
          {submitting ? "Сохранение..." : "Сохранить"}
        </button>
      </div>
    </form>
  );
}

function UserFormFields({
  lastName,
  firstName,
  middleName,
  phone,
  email,
  status,
  tariffCategory,
  residency,
  onLastName,
  onFirstName,
  onMiddleName,
  onPhone,
  onEmail,
  onStatus,
  onTariffCategory,
  onResidency,
  showTariff = false,
}: {
  lastName: string;
  firstName: string;
  middleName: string;
  phone: string;
  email: string;
  status: UserStatus;
  tariffCategory: TariffCategory;
  residency: CustomerResidency;
  onLastName: (value: string) => void;
  onFirstName: (value: string) => void;
  onMiddleName: (value: string) => void;
  onPhone: (value: string) => void;
  onEmail: (value: string) => void;
  onStatus: (value: UserStatus) => void;
  onTariffCategory?: (value: TariffCategory) => void;
  onResidency?: (value: CustomerResidency) => void;
  showTariff?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <div className="text-sm mb-1">Фамилия</div>
        <input
          className="ui-input w-full"
          required
          value={lastName}
          onChange={(event) => onLastName(event.target.value)}
        />
      </div>
      <div>
        <div className="text-sm mb-1">Имя</div>
        <input
          className="ui-input w-full"
          required
          value={firstName}
          onChange={(event) => onFirstName(event.target.value)}
        />
      </div>
      <div className="col-span-2">
        <div className="text-sm mb-1">Отчество</div>
        <input
          className="ui-input w-full"
          value={middleName}
          onChange={(event) => onMiddleName(event.target.value)}
          placeholder="(необязательно)"
        />
      </div>
      <div>
        <div className="text-sm mb-1">Телефон</div>
        <input
          className="ui-input w-full"
          required
          value={phone}
          onChange={(event) => onPhone(event.target.value)}
        />
      </div>
      <div>
        <div className="text-sm mb-1">E-mail</div>
        <input
          className="ui-input w-full"
          required
          type="email"
          value={email}
          onChange={(event) => onEmail(event.target.value)}
        />
      </div>
      <div className="col-span-2">
        <div className="text-sm mb-1">Статус</div>
        <select
          className="ui-input"
          value={status}
          onChange={(event) => onStatus(event.target.value as UserStatus)}
        >
          <option>Активен</option>
          <option>Заблокирован</option>
          <option>Фин контроль</option>
        </select>
      </div>
      {showTariff && onTariffCategory && onResidency ? (
        <>
          <div>
            <div className="text-sm mb-1">Тариф</div>
            <select
              className="ui-input w-full"
              value={tariffCategory}
              onChange={(event) =>
                onTariffCategory(event.target.value as TariffCategory)
              }
            >
              {(["K1", "K2", "K3", "K4", "K5", "K6"] as TariffCategory[]).map(
                (item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ),
              )}
            </select>
          </div>
          <div>
            <div className="text-sm mb-1">Резидентство</div>
            <select
              className="ui-input w-full"
              value={residency}
              onChange={(event) =>
                onResidency(event.target.value as CustomerResidency)
              }
            >
              <option value="RESIDENT">Резидент</option>
              <option value="NON_RESIDENT">Нерезидент</option>
            </select>
          </div>
        </>
      ) : null}
    </div>
  );
}

function DeleteUserConfirm({
  user,
  onCancel,
  onDelete,
}: {
  user: User | null;
  onCancel: () => void;
  onDelete: () => Promise<void> | void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="space-y-4 text-sm">
      <div>
        Вы уверены, что хотите удалить пользователя «{user?.fullName || ""}»?
      </div>
      {err && <div className="text-sm text-red-500">{err}</div>}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <button className="btn w-full h-9" onClick={onCancel}>
          Отмена
        </button>
        <button
          className="btn btn-danger w-full h-9"
          disabled={submitting}
          onClick={async () => {
            if (!user) return;
            setErr(null);
            setSubmitting(true);
            try {
              await deleteUser(user.id);
              await onDelete();
            } catch (error: any) {
              setErr(error?.message || "Не удалось удалить пользователя");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          Удалить
        </button>
      </div>
    </div>
  );
}
