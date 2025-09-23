"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Filters as FiltersType, OperationType } from "../types";
import { Range, getTrackBackground } from "react-range";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/airbnb.css";
import { Russian } from "flatpickr/dist/l10n/ru.js";

export default function FiltersBar({ value, onChange }: { value: FiltersType; onChange: (v: FiltersType) => void }) {
  const [local, setLocal] = useState<FiltersType>({ ...value });
  useEffect(() => setLocal(value), [value]);
  useEffect(() => { const t = setTimeout(() => onChange(local), 200); return () => clearTimeout(t); }, [local, onChange]);

  const statuses = useMemo(() => ([
    { value: "all", label: "Все" },
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

  const toggleSet = (arr: string[] | undefined, v: string) => {
    const s = new Set(arr || []); if (s.has(v)) s.delete(v); else s.add(v); return Array.from(s);
  };

  const reset = () => setLocal({ q: "", status: "all", currencies: [], operations: [], dateFrom: undefined, dateTo: undefined, minAmount: undefined, maxAmount: undefined });

  const active = {
    dates: !!(local.dateFrom || local.dateTo),
    assets: !!(local.currencies && local.currencies.length),
    ops: !!(local.operations && local.operations.length),
    amount: typeof local.minAmount === "number" || typeof local.maxAmount === "number",
  };

  const presets = [
    { label: "Сегодня", days: 0 },
    { label: "7 дней", days: 7 },
    { label: "30 дней", days: 30 },
    { label: "Этот месяц", month: "current" as const },
  ];

  return (
    <section className="rounded-xl border border-soft p-3 card">
      <header className="text-sm text-muted mb-2">Фильтры</header>
      <div className="flex items-center gap-2">
        <Segment
          items={statuses}
          value={local.status || "all"}
          onChange={(v) => setLocal({ ...local, status: v as any })}
        />

        <input className="ui-input h-8 w-[320px] min-w-[160px]" placeholder="Поиск" value={local.q}
               onChange={(e) => setLocal({ ...local, q: e.target.value })} />

        <DropdownMulti label="Активы" options={assets} selected={new Set(local.currencies || [])}
                        onToggle={(v) => setLocal({ ...local, currencies: toggleSet(local.currencies, v) })}
                        active={active.assets} />

        <DropdownMulti label="Типы" options={ops} selected={new Set((local.operations as string[] | undefined) || [])}
                        onToggle={(v) => setLocal({ ...local, operations: toggleSet((local.operations as any) || [], v) as any })}
                        active={active.ops} />

        <DateButton label="Дата от" value={local.dateFrom} onChange={(iso) => setLocal({ ...local, dateFrom: iso })}
                    presets={presets} active={active.dates} />
        <DateButton label="Дата до" value={local.dateTo} onChange={(iso) => setLocal({ ...local, dateTo: iso })}
                    presets={presets} active={active.dates} />

        <AmountInline min={local.minAmount ?? 0} max={local.maxAmount ?? 1_000_000}
                       onChange={(min, max) => setLocal({ ...local, minAmount: min, maxAmount: max })}
                       active={active.amount} />

        <div className="ml-auto" />
        <button className="btn h-8 px-3" onClick={reset} title="Сбросить фильтры">↺ Сброс</button>
      </div>
    </section>
  );
}

function Segment({ items, value, onChange }: { items: { value: string; label: string }[]; value: string; onChange: (v: string) => void; }) {
  return (
    <div className="segment">
      {items.map((s) => {
        const color = s.value === "confirmed" ? "var(--success)" : s.value === "pending" ? "var(--warning)" : s.value === "declined" ? "var(--danger)" : "var(--muted)";
        return (
          <button key={s.value} className="text-xs flex items-center gap-2" aria-pressed={String(value === s.value)} onClick={() => onChange(s.value)}>
            <span className="dot" style={{ background: color }} />
            {s.label}
          </button>
        );
      })}
    </div>
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
      <button ref={btnRef} className={`btn h-8 ${active ? "ring-1" : ""}`} onClick={() => setOpen((o) => !o)}>
        {label}{selected.size ? ` (${selected.size})` : ""}
      </button>
      {open && createPortal(
        <div style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 1000 }}>
          <div className="card border border-soft rounded-xl shadow-xl p-2" style={{ background: "var(--card)" }}>
            <div className="max-h-72 overflow-auto flex flex-col gap-1">
              {options.map((opt) => {
                const checked = selected.has(String(opt.value));
                return (
                  <button key={String(opt.value)} className={`flex items-center justify-between px-2 py-2 rounded hover-surface ${checked ? "bg-[color:var(--hover)]/20" : ""}`} onClick={() => onToggle(String(opt.value))}>
                    <div className="flex items-center gap-2">
                      {opt.icon && <span className="w-5 text-center">{opt.icon}</span>}
                      <span className="text-sm">{opt.label}</span>
                    </div>
                    <span className={`text-lg ${checked ? "text-[color:var(--primary)]" : "opacity-40"}`}>☑</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-right">
              <button className="btn btn-primary h-8" onClick={() => setOpen(false)}>Выбрать</button>
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
      <button className={`btn h-8 ${active ? "ring-1" : ""}`} onClick={() => setOpen(true)}>{label}</button>
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
