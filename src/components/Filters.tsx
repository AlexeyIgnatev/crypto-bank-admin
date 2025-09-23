"use client";
import { useEffect, useMemo, useState } from "react";
import { Filters as FiltersType } from "../types";
import { Range, getTrackBackground } from "react-range";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/airbnb.css";
import { Russian } from "flatpickr/dist/l10n/ru.js";

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
    { value: "COM", label: "СОМ", icon: "🪙" },
    { value: "SALAM", label: "Салам", icon: "🧧" },
    { value: "BTC", label: "Bitcoin", icon: "₿" },
    { value: "USDT", label: "USDT", icon: "Ⓣ" },
    { value: "ETH", label: "Ethereum", icon: "◆" },

  const operationOptions = [
    { value: "bank", label: "Банк" },
    { value: "crypto", label: "Крипто" },
    { value: "exchange", label: "Обмен" },
  ];

  const toggleCurrency = (v: string) => {
    const set = new Set(local.currencies || []);
    if (set.has(v)) set.delete(v); else set.add(v);
    setLocal({ ...local, currencies: Array.from(set) });
  };

  const toggleOperation = (v: string) => {
    const set = new Set(local.operations || []);
    if (set.has(v as any)) set.delete(v as any); else set.add(v as any);
    setLocal({ ...local, operations: Array.from(set) as any });
  };


  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const presets = [
    { label: "Сегодня", days: 0 },
    { label: "7 дней", days: 7 },
    { label: "30 дней", days: 30 },
    { label: "Этот месяц", month: "current" as const },
  ];

  const fmt = (iso?: string) => iso ? new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
  const statusMeta = (v: string) => {
    const color = v === "confirmed" ? "var(--success)" : v === "pending" ? "var(--warning)" : v === "declined" ? "var(--danger)" : "var(--muted)";
    const label = statuses.find(s => s.value === v)?.label || v;
    return { color, label };
  };
  const summaryChips = useMemo(() => {
    const chips: JSX.Element[] = [];
    if (local.status && local.status !== "all") {
      const { color, label } = statusMeta(local.status);
      chips.push(<span key="status" className="chip"><span className="dot" style={{ background: color }} />{label}</span>);
    }
    if (local.currencies && local.currencies.length) {
      chips.push(<span key="curr" className="chip">Валюты: {local.currencies.join(", ")}</span>);
    }
    if (local.dateFrom || local.dateTo) {
      const text = `${local.dateFrom ? `с ${fmt(local.dateFrom)}` : ""}${local.dateFrom && local.dateTo ? " — " : ""}${local.dateTo ? `по ${fmt(local.dateTo)}` : ""}`;
      chips.push(<span key="dates" className="chip">{text}</span>);
    }
    if (local.minAmount != null || local.maxAmount != null) {
      const min = local.minAmount != null ? local.minAmount.toLocaleString() : "…";
      const max = local.maxAmount != null ? local.maxAmount.toLocaleString() : "…";
      chips.push(<span key="amt" className="chip">Сумма: {min}–{max}</span>);
    }
    if (local.q && local.q.trim()) {
      chips.push(<span key="q" className="chip">Поиск: {local.q.trim()}</span>);
    }
    return chips;
  }, [local]);

  return (
    <div className="rounded-xl border border-soft p-4 card">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted">Фильтры</div>
        <div className="segment">
          {statuses.map(s => {
            const color = s.value === "confirmed" ? "var(--success)" : s.value === "pending" ? "var(--warning)" : s.value === "declined" ? "var(--danger)" : "var(--muted)";
            return (
              <button
                key={s.value}
                className="text-sm flex items-center gap-2"
                aria-pressed={String(local.status === s.value)}
                onClick={() => setLocal({ ...local, status: s.value as any })}
              >
                <span className="dot" style={{ background: color }} />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* One-line toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status inline */}
        <div className="segment">
          {statuses.map(s => {
            const color = s.value === "confirmed" ? "var(--success)" : s.value === "pending" ? "var(--warning)" : s.value === "declined" ? "var(--danger)" : "var(--muted)";
            return (
              <button key={s.value} className="text-xs flex items-center gap-2" aria-pressed={String(local.status === s.value)} onClick={() => setLocal({ ...local, status: s.value as any })}>
                <span className="dot" style={{ background: color }} />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <input className="ui-input h-8 w-44" placeholder="Поиск" value={local.q} onChange={e=>setLocal({ ...local, q: e.target.value })} />

        {/* Currencies dropdown */}
        <MultiSelect
          label="Активы"
          options={currencyOptions}
          selected={new Set(local.currencies || [])}
          onToggle={toggleCurrency}
        />

        {/* Operations dropdown */}
        <MultiSelect
          label="Типы"
          options={operationOptions}
          selected={new Set(local.operations || [])}
          onToggle={toggleOperation}
        />

        {/* Date from/to triggers */}
        <button className={`btn h-8 ${local.dateFrom || local.dateTo ? "ring-1" : ""}`} onClick={()=>setDateFromOpen(true)}>Дата от</button>
        <button className={`btn h-8 ${local.dateFrom || local.dateTo ? "ring-1" : ""}`} onClick={()=>setDateToOpen(true)}>Дата до</button>

        {/* Amount compact widget */}
        <AmountCompact
          value={[local.minAmount ?? 0, local.maxAmount ?? 1_000_000]}
          onChange={(min, max)=>setLocal({ ...local, minAmount:min, maxAmount:max })}
        />

        <div className="ml-auto flex items-center gap-2">
          <button className="btn btn-ghost h-8" onClick={()=>setLocal({ ...value, currencies: [], operations: [] })}>Сброс</button>
        </div>
      </div>

      {/* Removed old grid */}
      <div className="hidden">
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
                aria-pressed={local.currencies?.includes(c.value) ? "true" : "false"}
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
          {dateFromOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0" style={{ background: "color-mix(in srgb, var(--foreground) 60%, transparent)" }} onClick={() => setDateFromOpen(false)} />
              <div className="relative w-[90vw] max-w-md rounded-xl card border border-soft shadow-xl p-4">
                <div className="font-semibold mb-2">Выбрать начало периода</div>
                <Flatpickr
                  options={{
                    enableTime: true,
                    dateFormat: "d.m.Y H:i",
                    time_24hr: true,
                    locale: Russian,
                    defaultDate: local.dateFrom ? new Date(local.dateFrom) : undefined,
                  }}
                  onChange={([d]) => setLocal({ ...local, dateFrom: d ? new Date(d).toISOString() : undefined })}
                  className="ui-input"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {presets.map(p => (
                    <button key={p.label} className="pill" onClick={() => {
                      const now = new Date();
                      if (p.days !== undefined) {
                        const from = new Date(now.getTime() - p.days * 24 * 60 * 60 * 1000);
                        setLocal({ ...local, dateFrom: from.toISOString(), dateTo: now.toISOString() });
                      } else if (p.month === "current") {
                        const start = new Date(now.getFullYear(), now.getMonth(), 1);
                        setLocal({ ...local, dateFrom: start.toISOString(), dateTo: now.toISOString() });
                      }
                      setDateFromOpen(false);
                    }}>{p.label}</button>
                  ))}
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button className="btn" onClick={() => setDateFromOpen(false)}>Отмена</button>
                  <button className="btn btn-primary" onClick={() => setDateFromOpen(false)}>Готово</button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">До (дата и время)</label>
          <button className="btn w-full justify-between" onClick={() => setDateToOpen(true)}>
            <span>{local.dateTo ? new Date(local.dateTo).toLocaleString() : "Не выбрано"}</span>
            <span>📅</span>
          </button>
          {dateToOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0" style={{ background: "color-mix(in srgb, var(--foreground) 60%, transparent)" }} onClick={() => setDateToOpen(false)} />
              <div className="relative w-[90vw] max-w-md rounded-xl card border border-soft shadow-xl p-4">
                <div className="font-semibold mb-2">Выбрать конец периода</div>
                <Flatpickr
                  options={{
                    enableTime: true,
                    dateFormat: "d.m.Y H:i",
                    time_24hr: true,
                    locale: Russian,
                    defaultDate: local.dateTo ? new Date(local.dateTo) : undefined,
                  }}
                  onChange={([d]) => setLocal({ ...local, dateTo: d ? new Date(d).toISOString() : undefined })}
                  className="ui-input"
                />
                <div className="mt-3 flex flex-wrap gap-2">

function MultiSelect({ label, options, selected, onToggle }: { label: string; options: { value: string; label: string; icon?: string }[]; selected: Set<string>; onToggle: (v: string) => void; }) {
  const [open, setOpen] = useState(false);
  const isActive = selected.size > 0;
  return (
    <div className="relative">
      <button className={`btn h-8 ${isActive ? "ring-1" : ""}`} onClick={()=>setOpen(o=>!o)}>
        {label}{isActive ? ` (${selected.size})` : ""}
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-60 card border border-soft rounded-xl shadow-xl p-2" style={{background:"var(--card)"}}>
          <div className="max-h-64 overflow-auto flex flex-col gap-1">
            {options.map(opt => {
              const checked = selected.has(opt.value);
              return (
                <button key={opt.value} className={`flex items-center justify-between px-2 py-2 rounded hover-surface ${checked?"bg-[color:var(--hover)]/20": ""}`} onClick={()=>onToggle(opt.value)}>
                  <div className="flex items-center gap-2">
                    {opt.icon && <span className="w-5 text-center">{opt.icon}</span>}
                    <span className="text-sm">{opt.label}</span>
                  </div>
                  <span className={`text-lg ${checked?"text-[color:var(--primary)]":"opacity-40"}`}>☑</span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 text-right">
            <button className="btn btn-primary h-8" onClick={()=>setOpen(false)}>Выбрать</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AmountCompact({ value, onChange }: { value: [number, number]; onChange: (min: number, max: number) => void }) {
  const [min, max] = value;
  const [editMin, setEditMin] = useState(false);
  const [editMax, setEditMax] = useState(false);
  const STEP = 1000; const MIN = 0; const MAX = 1_000_000;
  return (
    <div className="flex items-center gap-2">
      <div className="w-48 px-2 py-2 card rounded-lg border border-soft">
        <Range values={[min, max]} step={STEP} min={MIN} max={MAX} onChange={(vals)=>onChange(vals[0], vals[1])}
          renderTrack={({ props, children }) => (
            <div onMouseDown={props.onMouseDown} onTouchStart={props.onTouchStart} style={{ ...props.style, height: "26px", display: "flex", width: "100%" }}>
              <div ref={props.ref} style={{height:"6px",width:"100%",borderRadius:"9999px",background:getTrackBackground({ values:[min,max], colors:["var(--border-soft)","var(--primary)","var(--border-soft)"], min:MIN,max:MAX}),alignSelf:"center"}}>
                {children}
              </div>
            </div>
          )}
          renderThumb={({ props }) => (
            <div {...props} style={{...props.style,height:"16px",width:"16px",borderRadius:"50%",backgroundColor:"var(--card)",border:"2px solid var(--primary)"}} />
          )}
        />
        <div className="mt-1 flex justify-between text-[11px] text-muted">
          {editMin ? (
            <input autoFocus onBlur={()=>setEditMin(false)} className="ui-input h-6 w-20" type="number" value={min} onChange={e=>onChange(Number(e.target.value||0), max)} />
          ) : (
            <button className="underline decoration-dotted" onClick={()=>setEditMin(true)}>{min.toLocaleString()} ₸</button>
          )}
          {editMax ? (
            <input autoFocus onBlur={()=>setEditMax(false)} className="ui-input h-6 w-20 text-right" type="number" value={max} onChange={e=>onChange(min, Number(e.target.value||0))} />
          ) : (
            <button className="underline decoration-dotted" onClick={()=>setEditMax(true)}>{max.toLocaleString()} ₸</button>
          )}
        </div>
      </div>
    </div>
  );
}

                  {presets.map(p => (
                    <button key={p.label} className="pill" onClick={() => {
                      const now = new Date();
                      if (p.days !== undefined) {
                        const from = new Date(now.getTime() - p.days * 24 * 60 * 60 * 1000);
                        setLocal({ ...local, dateFrom: from.toISOString(), dateTo: now.toISOString() });
                      } else if (p.month === "current") {
                        const start = new Date(now.getFullYear(), now.getMonth(), 1);
                        setLocal({ ...local, dateFrom: start.toISOString(), dateTo: now.toISOString() });
                      }
                      setDateToOpen(false);
                    }}>{p.label}</button>
                  ))}
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button className="btn" onClick={() => setDateToOpen(false)}>Отмена</button>
                  <button className="btn btn-primary" onClick={() => setDateToOpen(false)}>Готово</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <label className="block text-xs text-muted mb-1">Сумма (ползунок)</label>
          <AmountRange
            value={[local.minAmount ?? 0, local.maxAmount ?? 1_000_000]}
            onChange={(min, max) => setLocal({ ...local, minAmount: min, maxAmount: max })}
          />
        </div>

        <div className="lg:col-span-2">
          <label className="block text-xs text-muted mb-1">Сумма</label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                inputMode="decimal"
                placeholder="От"
                value={local.minAmount ?? ""}
                onChange={(e) => setLocal({ ...local, minAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="ui-input pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">₸</span>
            </div>
            <div className="relative flex-1">
              <input
                type="number"
                inputMode="decimal"
                placeholder="До"
                value={local.maxAmount ?? ""}
                onChange={(e) => setLocal({ ...local, maxAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="ui-input pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">₸</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button onClick={() => setLocal(value)} className="btn btn-ghost">Сбросить</button>
        <button onClick={() => onChange(local)} className="btn btn-primary">Применить</button>
      </div>
    </div>
  );
}

function AmountRange({ value, onChange }: { value: [number, number]; onChange: (min: number, max: number) => void }) {
  const [min, max] = value;
  const STEP = 1000;
  const MIN = 0;
  const MAX = 1_000_000;
  return (
    <div className="px-2 py-3 card rounded-lg border border-soft">
      <Range
        values={[min, max]}
        step={STEP}
        min={MIN}
        max={MAX}
        onChange={(vals) => onChange(vals[0], vals[1])}
        renderTrack={({ props, children }) => (
          <div
            onMouseDown={props.onMouseDown}
            onTouchStart={props.onTouchStart}
            style={{ ...props.style, height: "36px", display: "flex", width: "100%" }}
          >
            <div
              ref={props.ref}
              style={{
                height: "6px",
                width: "100%",
                borderRadius: "9999px",
                background: getTrackBackground({ values: [min, max], colors: ["var(--border-soft)", "var(--primary)", "var(--border-soft)"], min: MIN, max: MAX }),
                alignSelf: "center",
              }}
            >
              {children}
            </div>
          </div>
        )}
        renderThumb={({ props, index }) => (
          <div
            {...props}
            style={{
              ...props.style,
              height: "18px",
              width: "18px",
              borderRadius: "50%",
              backgroundColor: "var(--card)",
              border: "2px solid var(--primary)",
              boxShadow: "0 1px 4px rgba(0,0,0,.2)",
            }}
            aria-label={index === 0 ? "Минимальная сумма" : "Максимальная сумма"}
          />
        )}
      />
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>{min.toLocaleString()} ₸</span>
        <span>{max.toLocaleString()} ₸</span>
      </div>
    </div>
  );
}

