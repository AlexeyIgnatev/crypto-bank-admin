"use client";
import { useEffect, useMemo, useState } from "react";
import { Filters as FiltersType } from "../types";

export default function Filters({ value, onChange }: { value: FiltersType; onChange: (v: FiltersType) => void }) {
  const [local, setLocal] = useState<FiltersType>(value);

  useEffect(() => setLocal(value), [value]);

  useEffect(() => {
    const id = setTimeout(() => onChange(local), 250);
    return () => clearTimeout(id);
  }, [local, onChange]);

  const statuses = useMemo(() => [
    { value: "all", label: "Все" },
    { value: "confirmed", label: "Подтверждено" },
    { value: "pending", label: "В ожидании" },
    { value: "declined", label: "Отклонено" },
  ], []);

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 p-3 card">
      <div className="grid md:grid-cols-5 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs text-neutral-500 mb-1">Поиск</label>
          <input
            value={local.q}
            onChange={(e) => setLocal({ ...local, q: e.target.value })}
            placeholder="ID, отправитель, получатель"
            className="w-full px-3 py-2 rounded border bg-transparent focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Статус</label>
          <select
            value={local.status}
            onChange={(e) => setLocal({ ...local, status: e.target.value as any })}
            className="w-full px-3 py-2 rounded border bg-transparent"
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">От</label>
          <input
            type="date"
            value={local.dateFrom?.slice(0, 10) || ""}
            onChange={(e) => setLocal({ ...local, dateFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
            className="w-full px-3 py-2 rounded border bg-transparent"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">До</label>
          <input
            type="date"
            value={local.dateTo?.slice(0, 10) || ""}
            onChange={(e) => setLocal({ ...local, dateTo: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
            className="w-full px-3 py-2 rounded border bg-transparent"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Мин. сумма</label>
          <input
            type="number"
            inputMode="decimal"
            value={local.minAmount ?? ""}
            onChange={(e) => setLocal({ ...local, minAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
            className="w-full px-3 py-2 rounded border bg-transparent"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Макс. сумма</label>
          <input
            type="number"
            inputMode="decimal"
            value={local.maxAmount ?? ""}
            onChange={(e) => setLocal({ ...local, maxAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
            className="w-full px-3 py-2 rounded border bg-transparent"
          />
        </div>
        <div className="md:col-span-5 flex gap-2 justify-end">
          <button
            onClick={() => setLocal(value)}
            className="px-3 py-2 rounded border hover:bg-black/5 dark:hover:bg-white/10"
          >
            Сбросить
          </button>
          <button
            onClick={() => onChange(local)}
            className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700"
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
}
