"use client";

import Cards from "../components/Cards";
import Table from "../components/Table";
import Modal from "../components/Modal";
import UserDetails from "../components/UserDetails";
import { useCallback, useState } from "react";
import { formatAmount2, formatAmount6 } from "@/lib/format";
import {
  CustomerResidency,
  TariffCategory,
  Transaction,
  TransactionStatus,
  User,
} from "../types";
import { getUserById, updateUser } from "@/lib/api";

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function nowIso(): string {
  return new Date().toISOString();
}

export default function Home() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [cardsPeriod, setCardsPeriod] = useState<{
    dateFrom?: string;
    dateTo?: string;
  }>({
    dateFrom: startOfTodayIso(),
    dateTo: nowIso(),
  });
  const [openUser, setOpenUser] = useState(false);
  const [openUserEdit, setOpenUserEdit] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handlePeriodChange = useCallback(
    (period: { dateFrom?: string; dateTo?: string }) => {
      setCardsPeriod((prev) =>
        prev.dateFrom === period.dateFrom && prev.dateTo === period.dateTo
          ? prev
          : period,
      );
    },
    [],
  );

  async function openUserModalById(id: string) {
    try {
      const user = await getUserById(id);
      setSelectedUser(user);
      setOpenUser(true);
    } catch {}
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <Cards dateFrom={cardsPeriod.dateFrom} dateTo={cardsPeriod.dateTo} />
      </div>
      <div className="min-h-0 flex-1 flex flex-col">
        <Table
          onOpen={(tx) => {
            setSelected(tx);
            setOpen(true);
          }}
          onPeriodChange={handlePeriodChange}
        />
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="?????? ??????????"
      >
        {selected && (
          <div className="space-y-2 text-sm text-fg">
            <Row label="ID/tx_hash" value={selected.id} mono />
            <Row label="??????" value={<StatusBadge status={selected.status} />} />
            <Row
              label="????"
              value={new Date(selected.createdAt).toLocaleString()}
            />
            <Row
              label="?????"
              value={`${formatAmount6(selected.amount)} ${selected.currency}`}
            />
            <Row
              label="???????? ?????"
              value={formatAmount2(Number(selected.feeAmount || 0))}
            />
            {selected.currency === "USDT" && (
              <>
                <Row
                  label="??????? ????????"
                  value={
                    selected.networkFeeAmount != null
                      ? `${formatAmount6(selected.networkFeeAmount)} ${selected.networkFeeAsset || ""}`.trim()
                      : "?"
                  }
                />
                <Row
                  label="????????? ???? (energy)"
                  value={
                    selected.energyUsed != null
                      ? selected.energyUsed.toLocaleString()
                      : "?"
                  }
                />
                <Row
                  label="????????? ???? (bandwidth)"
                  value={
                    selected.bandwidthUsed != null
                      ? selected.bandwidthUsed.toLocaleString()
                      : "?"
                  }
                />
              </>
            )}
            {selected.currency === "SALAM" && (
              <Row
                label="??????? BRICS"
                value={
                  selected.bricsBurnedAmount != null
                    ? formatAmount6(selected.bricsBurnedAmount)
                    : "?"
                }
              />
            )}
            <Row
              label="???????????"
              value={
                <UserLinkValue
                  text={selected.sender}
                  customerId={selected.senderCustomerId}
                  onOpenUser={openUserModalById}
                />
              }
            />
            <Row
              label="ID ??????????? ABS"
              value={selected.senderAbsId || selected.senderCustomerId || "?"}
              mono
            />
            <Row
              label="??????????"
              value={
                <UserLinkValue
                  text={selected.recipient}
                  customerId={selected.recipientCustomerId}
                  onOpenUser={openUserModalById}
                />
              }
            />
            <Row
              label="ID ?????????? ABS"
              value={
                selected.recipientAbsId || selected.recipientCustomerId || "?"
              }
              mono
            />
            <Row
              label="ID ??????? ABS"
              value={
                selected.clientAbsId ||
                selected.senderCustomerId ||
                selected.recipientCustomerId ||
                "?"
              }
              mono
            />
          </div>
        )}
      </Modal>

      <Modal
        open={openUser}
        onClose={() => setOpenUser(false)}
        title="????????????"
      >
        {selectedUser && (
          <UserDetails
            user={selectedUser}
            onClose={() => setOpenUser(false)}
            onEdit={() => {
              setOpenUser(false);
              setOpenUserEdit(true);
            }}
            onDelete={() => setOpenUser(false)}
          />
        )}
      </Modal>

      <Modal
        open={openUserEdit}
        onClose={() => setOpenUserEdit(false)}
        title="?????????????? ????????????"
      >
        {selectedUser && (
          <EditUserInline
            user={selectedUser}
            onCancel={() => setOpenUserEdit(false)}
            onSave={(next) => {
              setSelectedUser(next);
              setOpenUserEdit(false);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function UserLinkValue({
  text,
  customerId,
  onOpenUser,
}: {
  text: string;
  customerId?: string | number;
  onOpenUser: (id: string) => Promise<void>;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="truncate" title={text}>
        {text}
      </span>
      {customerId && (
        <button
          className="inline-flex items-center justify-center h-7 w-7 rounded-full ml-auto shrink-0 bg-blue-600 hover:bg-blue-500"
          onClick={() => onOpenUser(String(customerId))}
          aria-label="??????? ????????????"
          title="??????? ????????????"
        >
          <svg
            viewBox="0 0 20 20"
            width="14"
            height="14"
            aria-hidden="true"
            className="pointer-events-none"
          >
            <path
              fill="#fff"
              fillRule="evenodd"
              d="M10 8a3 3 0 100-6 3 3 0 000 6zM3 14a7 7 0 1114 0H3z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

function EditUserInline({
  user,
  onCancel,
  onSave,
}: {
  user: User;
  onCancel: () => void;
  onSave: (u: User) => void;
}) {
  const [lastName, setLastName] = useState(user.fullName.split(" ")[0] || "");
  const [firstName, setFirstName] = useState(user.fullName.split(" ")[1] || "");
  const [middleName, setMiddleName] = useState(
    user.fullName.split(" ")[2] || "",
  );
  const [phone, setPhone] = useState(user.phone);
  const [email, setEmail] = useState(user.email);
  const [status, setStatus] = useState(user.status);
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
      onSubmit={async (e) => {
        e.preventDefault();
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
          onSave({
            ...user,
            fullName: [lastName, firstName, middleName]
              .filter(Boolean)
              .join(" "),
            phone,
            email,
            status,
            tariffCategory,
            residency,
          });
        } catch (error: any) {
          setErr(error?.message || "Не удалось обновить пользователя");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-sm mb-1">Фамилия</div>
          <input
            className="ui-input w-full"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
        <div>
          <div className="text-sm mb-1">Имя</div>
          <input
            className="ui-input w-full"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div className="col-span-2">
          <div className="text-sm mb-1">Отчество</div>
          <input
            className="ui-input w-full"
            value={middleName}
            onChange={(e) => setMiddleName(e.target.value)}
            placeholder="(необязательно)"
          />
        </div>
        <div>
          <div className="text-sm mb-1">Телефон</div>
          <input
            className="ui-input w-full"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div>
          <div className="text-sm mb-1">E-mail</div>
          <input
            className="ui-input w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
        </div>
        <div className="col-span-2">
          <div className="text-sm mb-1">??????</div>
          <select
            className="ui-input"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="BLOCKED">BLOCKED</option>
            <option value="FRAUD">FRAUD</option>
          </select>
        </div>
        <div>
          <div className="text-sm mb-1">?????</div>
          <select
            className="ui-input w-full"
            value={tariffCategory}
            onChange={(e) =>
              setTariffCategory(e.target.value as TariffCategory)
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
          <div className="text-sm mb-1">????????????</div>
          <select
            className="ui-input w-full"
            value={residency}
            onChange={(e) => setResidency(e.target.value as CustomerResidency)}
          >
            <option value="RESIDENT">????????</option>
            <option value="NON_RESIDENT">??????????</option>
          </select>
        </div>
      </div>
      {err && <div className="text-sm text-red-500">{err}</div>}
      <div className="grid grid-cols-2 gap-2 pt-4">
        <button
          type="button"
          className="btn w-full h-9"
          onClick={onCancel}
          disabled={submitting}
        >
          ??????
        </button>
        <button
          type="submit"
          className="btn btn-success w-full h-9"
          disabled={submitting}
        >
          {submitting ? "??????????..." : "?????????"}
        </button>
      </div>
    </form>
  );
}

function StatusBadge({ status }: { status: TransactionStatus }) {
  const cls =
    status === "SUCCESS"
      ? "badge-success"
      : status === "PENDING"
        ? "badge-warning"
        : "badge-danger";
  const text =
    status === "SUCCESS"
      ? "???????"
      : status === "PENDING"
        ? "? ?????????"
        : status === "REJECTED"
          ? "?????????"
          : "??????"

  return <span className={`badge ${cls} whitespace-nowrap`}>{text}</span>;
}

export function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 items-center">
      <div className="text-muted">{label}</div>
      <div className={`col-span-2 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

