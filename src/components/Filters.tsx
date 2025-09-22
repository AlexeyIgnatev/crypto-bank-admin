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
    { value: "confirmed", label: "Подтв." },
    { value: "pending", label: "Ожидает" },
    { value: "declined", label: "Отклонено" },
  ], []);

  const currencyOptions = [
    { value: "KGS", label: "KGS", icon: "🇰🇬" },
    { value: "USD", label: "USD", icon: "🇺🇸" },
    { value: "EUR", label: "EUR", icon: "🇪🇺" },
  ];

  const toggleCurrency = (v: string) => {
    const set = new Set(local.currencies || []);
    if (set.has(v)) set.delete(v); else set.add(v);
    setLocal({ ...local, currencies: Array.from(set) });
  };

  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);

  return (
    <div className="rounded-xl border border-soft p-4 card">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted">Фильтры</div>
        <div className="segment">
          {statuses.map(s => (
            <button
              key={s.value}
              className="text-sm"
              aria-pressed={String(local.status === s.value)}
              onClick={() => setLocal({ ...local, status: s.value as any })}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-6 md:grid-cols-3 grid-cols-1 gap-3">
        <div className="lg:col-span-2">
          <label className="block text-xs text-muted mb-1">Поиск</label>
          <input
            value={local.q}
            onChange={(e) => setLocal({ ...local, q: e.target.value })}
            placeholder="ID, отправитель, получатель"
            className="ui-input"
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Валюты</label>
          <div className="flex flex-wrap gap-2">
            {currencyOptions.map(c => (
              <button
                key={c.value}
                className="chip"
                aria-pressed={String(local.currencies?.includes(c.value))}
                onClick={() => toggleCurrency(c.value)}
                title={c.label}
              >
                <span className="icon">{c.icon}</span>
                <span className="text-xs">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">От (дата и время)</label>
          <button className="btn w-full justify-between" onClick={() => setDateFromOpen(true)}>
            <span>{local.dateFrom ? new Date(local.dateFrom).toLocaleString() : "Не выбрано"}</span>
            <span>📅</span>
          </button>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">До (дата и время)</label>
          <button className="btn w-full justify-between" onClick={() => setDateToOpen(true)}>
            <span>{local.dateTo ? new Date(local.dateTo).toLocaleString() : "Не выбрано"}</span>
            <span>📅</span>
          </button>
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Сумма от</label>
          <input
            type="number"
            inputMode="decimal"
            value={local.minAmount ?? ""}
            onChange={(e) => setLocal({ ...local, minAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
            className="ui-input"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Сумма до</label>
          <input
            type="number"
            inputMode="decimal"
            value={local.maxAmount ?? ""}
            onChange={(e) => setLocal({ ...local, maxAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
            className="ui-input"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button onClick={() => setLocal(value)} className="btn btn-ghost">Сбросить</button>
        <button onClick={() => onChange(local)} className="btn btn-primary">Применить</button>
      </div>

      {dateFromOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: "color-mix(in srgb, var(--foreground) 60%, transparent)" }} onClick={() => setDateFromOpen(false)} />
          <div className="relative w-[90vw] max-w-md rounded-xl card border border-soft shadow-xl p-4">
            <div className="font-semibold mb-2">Выбрать начало периода</div>
            <input type="datetime-local" className="ui-input" value={local.dateFrom ? new Date(local.dateFrom).toISOString().slice(0,16) : ""}
              onChange={(e) => setLocal({ ...local, dateFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
            <div className="mt-3 flex justify-end gap-2">
              <button className="btn" onClick={() => setDateFromOpen(false)}>Отмена</button>
              <button className="btn btn-primary" onClick={() => setDateFromOpen(false)}>Готово</button>
            </div>
          </div>
        </div>
      )}

      {dateToOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: "color-mix(in srgb, var(--foreground) 60%, transparent)" }} onClick={() => setDateToOpen(false)} />
          <div className="relative w-[90vw] max-w-md rounded-xl card border border-soft shadow-xl p-4">
            <div className="font-semibold mb-2">Выбрать конец периода</div>
            <input type="datetime-local" className="ui-input" value={local.dateTo ? new Date(local.dateTo).toISOString().slice(0,16) : ""}
              onChange={(e) => setLocal({ ...local, dateTo: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
            <div className="mt-3 flex justify-end gap-2">
              <button className="btn" onClick={() => setDateToOpen(false)}>Отмена</button>
              <button className="btn btn-primary" onClick={() => setDateToOpen(false)}>Готово</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
