"use client";
import React from "react";
import { User } from "../types";
import { formatAmount6 } from "@/lib/format";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="text-muted">{label}</div>
      <div className="col-span-2">{value}</div>
    </div>
  );
}

export default function UserDetails({ user, onClose, onEdit, onDelete }: { user: User; onClose: () => void; onEdit: () => void; onDelete: () => void; }) {
  const total = user.balances.COM + user.balances.SALAM + user.balances.BTC + user.balances.ETH + user.balances.USDT;
  return (
    <div className="space-y-3 text-sm">
      <Row label="ФИО" value={user.fullName} />
      <Row label="Телефон" value={user.phone} />
      <Row label="E-mail" value={user.email} />
      <Row label="Статус" value={<span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${user.status === "Активен" ? "bg-green-500/20 text-green-700" : user.status === "Фин контроль" ? "bg-amber-500/20 text-amber-700" : "bg-red-500/20 text-red-700"}`}>{user.status}</span>} />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="text-muted">Балансы</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>COM</div><div className="text-right">{formatAmount6(user.balances.COM)}</div>
            <div>SALAM</div><div className="text-right">{formatAmount6(user.balances.SALAM)}</div>
            <div>BTC</div><div className="text-right">{formatAmount6(user.balances.BTC)}</div>
            <div>ETH</div><div className="text-right">{formatAmount6(user.balances.ETH)}</div>
            <div>USDT</div><div className="text-right">{formatAmount6(user.balances.USDT)}</div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-muted">Итоги</div>
          <div className="flex justify-between"><span>Баланс СОМ</span><span>{formatAmount6(user.balances.COM)}</span></div>
          <div className="flex justify-between"><span>Общий баланс</span><span>{formatAmount6(total)}</span></div>
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
