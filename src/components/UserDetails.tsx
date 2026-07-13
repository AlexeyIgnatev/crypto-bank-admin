"use client";
import React from "react";
import { User } from "../types";
import { formatAmount6 } from "@/lib/format";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="text-sm text-muted">{label}</div>
      <div className="col-span-2 break-words text-sm text-fg">{value}</div>
    </div>
  );
}

export default function UserDetails({
  user,
  onClose,
  onEdit,
  onDelete,
}: {
  user: User;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const total = user.balances.COM + user.balances.SALAM + user.balances.USDT;

  return (
    <div className="space-y-4 text-sm">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="surface rounded-[24px] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Основные данные
          </div>
          <div className="mt-4 space-y-3">
            <Row label="ФИО" value={user.fullName} />
            <Row label="Телефон" value={user.phone} />
            <Row label="E-mail" value={user.email} />
            <Row
              label="Статус"
              value={
                <span
                  className={`badge ${
                    user.status === "Активен"
                      ? "badge-success"
                      : user.status === "Фин контроль"
                        ? "badge-warning"
                        : "badge-danger"
                  }`}
                >
                  {user.status}
                </span>
              }
            />
            <Row label="Комментарий к статусу" value={user.statusComment || "—"} />
            <Row label="Тариф" value={user.tariffCategory || "K1"} />
            <Row
              label="Резидентство"
              value={user.residency === "NON_RESIDENT" ? "Нерезидент" : "Резидент"}
            />
          </div>
        </div>

        <div className="surface rounded-[24px] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Балансы
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <BalanceTile label="COM" value={formatAmount6(user.balances.COM)} />
            <BalanceTile label="SALAM" value={formatAmount6(user.balances.SALAM)} />
            <BalanceTile
              label="USDT TRC20"
              value={formatAmount6(user.balances.USDT)}
            />
            <BalanceTile
              label="Общий баланс"
              value={formatAmount6(total)}
              accent
            />
          </div>

          <div className="mt-4 space-y-3 rounded-[20px] border border-[color:var(--border-soft)] bg-[color-mix(in_srgb,var(--card)_80%,var(--bg-soft))] p-4">
            <StatLine label="Создан" value={new Date(user.createdAt).toLocaleString()} />
            <StatLine
              label="Последний login"
              value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "—"}
            />
            <StatLine label="IP адрес" value={user.lastLoginIp || "—"} />
            <StatLine label="Модель устройства" value={user.lastLoginDevice || "—"} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-3">
        <button className="btn h-11 w-full" onClick={onClose}>
          Закрыть
        </button>
        <button className="btn btn-info h-11 w-full" onClick={onEdit}>
          Редактировать
        </button>
        <button className="btn btn-danger h-11 w-full" onClick={onDelete}>
          Удалить
        </button>
      </div>
    </div>
  );
}

function BalanceTile({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-[20px] border p-3 ${
        accent
          ? "border-[color:var(--primary)]/20 bg-[color-mix(in_srgb,var(--primary)_10%,var(--card))]"
          : "border-[color:var(--border-soft)] bg-[color-mix(in_srgb,var(--card)_80%,var(--bg-soft))]"
      }`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-fg">{value}</div>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="max-w-[65%] break-words text-right text-fg">{value}</span>
    </div>
  );
}
