"use client";
import React from "react";
import { User } from "../types";

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
