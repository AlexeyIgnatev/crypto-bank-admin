"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Filters as FiltersType, OperationType, TransactionStatus } from "../types";
import { Range, getTrackBackground } from "react-range";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/airbnb.css";
import { Russian } from "flatpickr/dist/l10n/ru.js";

export default function FiltersBar({ value, onChange }: { value: FiltersType; onChange: (v: FiltersType) => void }) {
  const [local, setLocal] = useState<FiltersType>({ ...value });
  useEffect(() => setLocal(value), [value]);
  useEffect(() => { const t = setTimeout(() => onChange(local), 200); return () => clearTimeout(t); }, [local, onChange]);

  const statuses = useMemo(() => ([
    { value: "confirmed", label: "Подтв." },
    { value: "pending", label: "Ожидает" },
    { value: "declined", label: "Отклонено" },
  ]), []);

  const assets = [
    { value: "COM", label: "СОМ", icon: "🪙" },
    { value: "SALAM", label: "Салам", icon: "🧧" },
    { value: "BTC", label: "Биткоин", icon: "₿" },
    { value: "USDT", label: "USDT", icon: "Ⓣ" },
    { value: "ETH", label: "ETH", icon: "◆" },
  ];

  const ops: { value: OperationType; label: string }[] = [
    { value: "bank", label: "Банк" },
    { value: "crypto", label: "Крипто" },
    { value: "exchange", label: "Обмен" },
  ];

  function toggleSet<T extends string>(arr: T[] | undefined, v: T): T[] {
    const s = new Set(arr || []);
    if (s.has(v)) s.delete(v); else s.add(v);
    return Array.from(s);
  }

  const reset = () => setLocal({ q: "", statuses: [], currencies: [], operations: [], dateFrom: undefined, dateTo: undefined, minAmount: undefined, maxAmount: undefined });

  const active = {
    dates: !!(local.dateFrom || local.dateTo),
    assets: !!(local.currencies && local.currencies.length),
    ops: !!(local.operations && local.operations.length),
    statuses: !!(local.statuses && local.statuses.length),

    amount: typeof local.minAmount === "number" || typeof local.maxAmount === "number",
  };

  const presets = [
    { label: "Сегодня", days: 0 },
    { label: "7 дней", days: 7 },
    { label: "30 дней", days: 30 },
    { label: "Этот месяц", month: "current" as const },
  ];



  return (
    <section className="rounded-xl border border-soft p-4 card">
      <header className="text-sm text-muted mb-3">Фильтры</header>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
        <div className="md:col-span-2">
          <StatusDropdown
            selected={new Set((local.statuses as string[] | undefined) || [])}
            onToggle={(v) => setLocal({ ...local, statuses: toggleSet(local.statuses as TransactionStatus[] | undefined, v as TransactionStatus) })}
            active={active.statuses}
          />
        </div>

        <div className="md:col-span-4">
          <input
            className="ui-input h-9 w-full"
            placeholder="Поиск"
            value={local.q}
            onChange={(e) => setLocal({ ...local, q: e.target.value })}
          />
        </div>

        <div className="md:col-span-2">
          <DropdownMulti
            label="Активы"
            options={assets}
            selected={new Set(local.currencies || [])}
            onToggle={(v) => setLocal({ ...local, currencies: toggleSet(local.currencies, v) })}
            active={active.assets}
          />
        </div>

        <div className="md:col-span-2">
          <DropdownMulti
            label="Типы"
            options={ops}
            selected={new Set((local.operations as string[] | undefined) || [])}
            onToggle={(v) => setLocal({ ...local, operations: toggleSet(local.operations as OperationType[] | undefined, v as OperationType) })}
            active={active.ops}
          />
        </div>

        <div className="md:col-span-1">
          <DateButton label="Дата от" value={local.dateFrom} onChange={(iso) => setLocal({ ...local, dateFrom: iso })} presets={presets} active={active.dates} />
        </div>
        <div className="md:col-span-1">
          <DateButton label="Дата до" value={local.dateTo} onChange={(iso) => setLocal({ ...local, dateTo: iso })} presets={presets} active={active.dates} />
        </div>

        <div className="md:col-span-2">
          <AmountButton
            min={local.minAmount}
            max={local.maxAmount}
            onChange={(min, max) => setLocal({ ...local, minAmount: min, maxAmount: max })}
            active={active.amount}
          />
        </div>

        <div className="md:col-span-12 flex justify-end">
          <button className="btn h-9 px-3" onClick={reset} title="Сбросить фильтры">↺ Сброс</button>
        </div>
      </div>
    </section>
  );
}

function StatusDropdown({ selected, onToggle, active }: { selected: Set<string>; onToggle: (v: string) => void; active?: boolean; }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const options = [
    { value: "confirmed", label: "Подтв.", color: "var(--success)" },
    { value: "pending", label: "Ожидает", color: "var(--warning)" },
    { value: "declined", label: "Отклонено", color: "var(--danger)" },
  ];
  const active = selected.size > 0;
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const r = btnRef.current?.getBoundingClientRect(); if (!r) return;
      const width = Math.max(200, Math.min(280, r.width));
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      setPos({ top: r.bottom + 6, left, width });
    };
    update();
    const onScroll = () => update();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", onScroll, true); window.removeEventListener("resize", update); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (e.target instanceof Node) { if (btnRef.current && btnRef.current.contains(e.target)) return; setOpen(false); } };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <>
      <button ref={btnRef} className={`btn h-9 w-full ${active ? "ring-1" : ""}`} onClick={() => setOpen((o) => !o)}>
        Статус{selected.size ? ` (${selected.size})` : ""} <span className="ml-1">▾</span>
      </button>
      {open && createPortal(
        <div style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 1000 }}>
          <div className="card border border-soft rounded-xl shadow-xl p-2" style={{ background: "var(--card)" }}>
            <div className="max-h-60 overflow-auto">
              {options.map((opt) => {
                const checked = selected.has(opt.value);
                return (
                  <label key={opt.value} className="flex items-center gap-2 px-2 py-2 rounded hover-surface cursor-pointer select-none">
                    <span className="w-2 h-2 rounded-full" style={{ background: opt.color }} />
                    <input type="checkbox" className="accent-[var(--primary)]" checked={checked} onChange={() => onToggle(opt.value)} />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>, document.body)}
    </>
  );
}

function DropdownMulti({ label, options, selected, onToggle, active }: {
  label: string;
  options: { value: string; label: string; icon?: string }[];
  selected: Set<string>;
  onToggle: (v: string) => void;
  active?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const r = btnRef.current?.getBoundingClientRect(); if (!r) return;
      const width = Math.max(240, Math.min(320, r.width));
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      setPos({ top: r.bottom + 6, left, width });
    };
    update();
    const onScroll = () => update();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", onScroll, true); window.removeEventListener("resize", update); };

  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (e.target instanceof Node) {
        if (btnRef.current && btnRef.current.contains(e.target)) return;
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <>
      <button ref={btnRef} className={`btn h-9 w-full ${active ? "ring-1" : ""}`} onClick={() => setOpen((o) => !o)}>
        {label}{selected.size ? ` (${selected.size})` : ""} <span className="ml-1">▾</span>
      </button>
      {open && createPortal(
        <div style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 1000 }}>
          <div className="card border border-soft rounded-xl shadow-xl p-2" style={{ background: "var(--card)" }}>
            <div className="max-h-72 overflow-auto">
              {options.map((opt) => {
                const value = String(opt.value);
                const checked = selected.has(value);
                return (
                  <label key={value} className="flex items-center gap-2 px-2 py-2 rounded hover-surface cursor-pointer select-none">
                    {opt.icon && <span className="w-5 text-center">{opt.icon}</span>}
                    <input type="checkbox" className="accent-[var(--primary)]" checked={checked} onChange={() => onToggle(value)} />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>, document.body)}
    </>
  );
}

function DateButton({ label, value, onChange, presets, active }: { label: string; value?: string; onChange: (iso?: string) => void; presets: { label: string; days?: number; month?: "current" }[]; active?: boolean; }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={`btn h-9 w-full ${active ? "ring-1" : ""}`} onClick={() => setOpen(true)}>{label}</button>
      {open && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: "color-mix(in srgb, var(--foreground) 60%, transparent)" }} onClick={() => setOpen(false)} />
          <div className="relative w-[90vw] max-w-md rounded-xl card border border-soft shadow-xl p-4">
            <div className="font-semibold mb-2">{label}</div>
            <Flatpickr options={{ enableTime: true, dateFormat: "d.m.Y H:i", time_24hr: true, locale: Russian, defaultDate: value ? new Date(value) : undefined }}
                       onChange={([d]) => onChange(d ? new Date(d).toISOString() : undefined)} className="ui-input" />
            <div className="mt-3 flex flex-wrap gap-2">
              {presets.map((p) => (
                <button key={p.label} className="pill" onClick={() => {
                  const now = new Date();
                  if (p.days !== undefined) { const from = new Date(now.getTime() - p.days * 24 * 60 * 60 * 1000); onChange(from.toISOString()); }
                  else if (p.month === "current") { const start = new Date(now.getFullYear(), now.getMonth(), 1); onChange(start.toISOString()); }
                  setOpen(false);
                }}>{p.label}</button>
              ))}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button className="btn" onClick={() => setOpen(false)}>Отмена</button>
              <button className="btn btn-ghost" onClick={() => { onChange(undefined); setOpen(false); }}>Очистить</button>
              <button className="btn btn-primary" onClick={() => setOpen(false)}>Готово</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Старый инлайн-диапазон заменён на модальное окно AmountButton выше
function AmountInline({ min, max, onChange, active }: { min: number; max: number; onChange: (min: number, max: number) => void; active?: boolean; }) {
  const [editMin, setEditMin] = useState(false);
  const [editMax, setEditMax] = useState(false);
  const STEP = 1000, MIN = 0, MAX = 1_000_000;
  return (
    <div className={`w-60 px-2 py-2 card rounded-lg border border-soft ${active ? "ring-1" : ""}`}>
      <Range values={[min, max]} step={STEP} min={MIN} max={MAX} onChange={(vals) => onChange(vals[0], vals[1])}
        renderTrack={({ props, children }) => (
          <div onMouseDown={props.onMouseDown} onTouchStart={props.onTouchStart} style={{ ...props.style, height: "26px", display: "flex", width: "100%" }}>
            <div ref={props.ref as any} style={{ height: "6px", width: "100%", borderRadius: "9999px", background: getTrackBackground({ values: [min, max], colors: ["var(--border-soft)", "var(--primary)", "var(--border-soft)"], min: MIN, max: MAX }), alignSelf: "center" }}>
              {children}
            </div>
          </div>
        )}
        renderThumb={({ props }) => (<div {...props} style={{ ...props.style, height: "16px", width: "16px", borderRadius: "50%", backgroundColor: "var(--card)", border: "2px solid var(--primary)" }} />)}
      />
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        {editMin ? (<input autoFocus onBlur={() => setEditMin(false)} className="ui-input h-6 w-20" type="number" value={min} onChange={(e) => onChange(Number(e.target.value || 0), max)} />)
                 : (<button className="underline decoration-dotted" onClick={() => setEditMin(true)}>{min.toLocaleString()} ₸</button>)}
        {editMax ? (<input autoFocus onBlur={() => setEditMax(false)} className="ui-input h-6 w-20 text-right" type="number" value={max} onChange={(e) => onChange(min, Number(e.target.value || 0))} />)
                 : (<button className="underline decoration-dotted" onClick={() => setEditMax(true)}>{max.toLocaleString()} ₸</button>)}
      </div>
    </div>
  );
}
