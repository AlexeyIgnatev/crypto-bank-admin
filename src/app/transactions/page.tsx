"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/airbnb.css";
import { Russian } from "flatpickr/dist/l10n/ru.js";
import { Transaction, TransactionStatus, Filters, OperationType } from "@/types";
import { applyFilters, generateTransactions } from "@/lib/mockRepo";
import { ResponsiveContainer, AreaChart as RCAreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from "recharts";

const currencyOptions = [
  { key: "COM", label: "СОМ" },
  { key: "SALAM", label: "САЛАМ" },
  { key: "BTC", label: "BTC" },
  { key: "ETH", label: "ETH" },
  { key: "USDT", label: "USDT" },
] as const;

const operationOptions: { key: OperationType; label: string }[] = [
  { key: "bank", label: "Банк (СОМ/САЛАМ)" },
  { key: "crypto", label: "Крипто" },
  { key: "exchange", label: "Обмен" },
];

export default function TransactionsAnalytics() {
  const data = useMemo(() => generateTransactions(500), []);

  // filters
  const [dateFrom, setDateFrom] = useState<string | undefined>(() => new Date(Date.now() - 30*24*3600*1000).toISOString());
  const [dateTo, setDateTo] = useState<string | undefined>(() => new Date().toISOString());
  const [statuses, setStatuses] = useState<Set<TransactionStatus>>(new Set());
  const [currencies, setCurrencies] = useState<Set<string>>(new Set());
  const [operations, setOperations] = useState<Set<OperationType>>(new Set());
  const [metric, setMetric] = useState<"sum" | "count">("sum");
  const [bucket, setBucket] = useState<"day" | "week" | "month">("day");

  const filtered = useMemo(() => {
    const f: Filters = {
      q: "",
      dateFrom,
      dateTo,
      statuses: statuses.size ? Array.from(statuses) : undefined,
      currencies: currencies.size ? Array.from(currencies) : undefined,
      operations: operations.size ? Array.from(operations) : undefined,
    };
    return applyFilters(data, f);
  }, [data, dateFrom, dateTo, statuses, currencies, operations]);

  const buckets = useMemo(() => bucketize(filtered, bucket, metric), [filtered, bucket, metric]);
  const totalSum = useMemo(() => filtered.reduce((a, t) => a + t.amount, 0), [filtered]);
  const insights = useMemo(() => buildInsights(filtered), [filtered]);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
      <div className="card border border-soft rounded-xl p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <DateRange
            from={dateFrom}
            to={dateTo}
            onFrom={setDateFrom}
            onTo={setDateTo}
          />

          <Field label="Статус">
            <MultiChips
              options={[{key:"confirmed",label:"Подтверждено"},{key:"pending",label:"В ожидании"},{key:"declined",label:"Отклонено"}]}
              selected={statuses}
              onToggle={(k) => toggleSet(setStatuses, k as TransactionStatus)}
            />
          </Field>

          <Field label="Валюты">
            <MultiChips
              options={currencyOptions as any}
              selected={currencies}
              onToggle={(k) => toggleSet(setCurrencies, k)}
            />
          </Field>

          <Field label="Тип операции">
            <MultiChips
              options={operationOptions as any}
              selected={operations}
              onToggle={(k) => toggleSet(setOperations, k as OperationType)}
            />
          </Field>

          <Field label="Метрика">
            <Segment value={metric} onChange={setMetric} options={[{key:"sum",label:"Сумма"},{key:"count",label:"Кол-во"}]} />
          </Field>
          <Field label="Группировка">
            <Segment value={bucket} onChange={setBucket} options={[{key:"day",label:"Дни"},{key:"week",label:"Недели"},{key:"month",label:"Месяцы"}]} />
          </Field>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-4 card border border-soft rounded-xl p-4 min-h-[420px]">
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-semibold">Статистика</div>
            <div className="text-sm text-muted">{metric === "sum" ? "Сумма переводов" : "Количество переводов"}</div>
          </div>
          <InteractiveChart data={buckets} metric={metric} />
        </div>
        <div className="lg:col-span-1 card border border-soft rounded-xl p-4 space-y-3">
          <Stat label="Общая сумма" value={totalSum.toLocaleString(undefined,{minimumFractionDigits:2})} suffix="" />
          <Stat label="Общее количество" value={filtered.length.toLocaleString()} />
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Топ валюта по сумме" value={`${insights.topCurrencyBySum.label}`} />
            <Stat label="Топ валюта по количеству" value={`${insights.topCurrencyByCount.label}`} />
            <Stat label="Наиболее активный день" value={`${insights.topDay.label}`} />
            <Stat label="Средний чек" value={`${insights.avgAmount.toLocaleString(undefined,{minimumFractionDigits:2})}`} />
          </div>

        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted mb-1">{label}</div>
      {children}
    </div>
  );
}

function DateRange({ from, to, onFrom, onTo }: { from?: string; to?: string; onFrom: (v?: string) => void; onTo: (v?: string) => void; }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <div className="text-xs text-muted mb-1">От</div>
        <Flatpickr
          className="ui-input w-full"
          value={from ? new Date(from) : null}
          options={{ enableTime: true, dateFormat: "d.m.Y H:i", time_24hr: true, locale: Russian }}
          onChange={([d]) => onFrom(d ? new Date(d).toISOString() : undefined)}
        />
      </div>
      <div>
        <div className="text-xs text-muted mb-1">До</div>
        <Flatpickr
          className="ui-input w-full"
          value={to ? new Date(to) : null}
          options={{ enableTime: true, dateFormat: "d.m.Y H:i", time_24hr: true, locale: Russian }}
          onChange={([d]) => onTo(d ? new Date(d).toISOString() : undefined)}
        />
      </div>
    </div>
  );
}

function MultiChips({ options, selected, onToggle }: { options: {key: string; label: string}[]; selected: Set<string>; onToggle: (key: string) => void; }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt.key} className="pill" aria-pressed={selected.has(opt.key)} onClick={() => onToggle(opt.key)}>
          <span className="dot" />{opt.label}
        </button>
      ))}
    </div>
  );
}

function Segment<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { key: T; label: string }[]; }) {
  return (
    <div className="segment">
      {options.map(opt => (
        <button key={opt.key} aria-pressed={value === opt.key} onClick={() => onChange(opt.key)}>{opt.label}</button>
      ))}
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="p-3 rounded-xl border border-soft">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className="text-2xl font-semibold">{value}{suffix ? ` ${suffix}` : ""}</div>
    </div>
  );

function InteractiveChart({ data, metric }: { data: BucketPoint[]; metric: "sum" | "count" }) {
  const yLabel = metric === "sum" ? "Сумма" : "Кол-во";
  return (
    <div className="w-full h-[340px]">
      <ResponsiveContainer width="100%" height="100%">
        <RCAreaChart data={data} margin={{ top: 10, right: 16, bottom: 24, left: 0 }}>
          <defs>
            <linearGradient id="rcGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border-soft)" vertical={false} />
          <XAxis dataKey="label" tickMargin={8} stroke="var(--muted)" />
          <YAxis tickMargin={8} stroke="var(--muted)" width={60} tickFormatter={(v) => metric === 'sum' ? Number(v).toLocaleString() : v} />
          <Tooltip formatter={(v: any) => metric === 'sum' ? Number(v).toLocaleString(undefined,{minimumFractionDigits:2}) : v} labelClassName="text-sm" />
          <Legend />
          <Area type="monotone" dataKey="value" name={yLabel} stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} fill="url(#rcGrad)" />
        </RCAreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ------- Chart -------

type BucketPoint = { label: string; ts: number; value: number };

function AreaChart({ data, metric }: { data: BucketPoint[]; metric: "sum" | "count" }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(600);
  const h = 320;
  const pad = { l: 36, r: 20, t: 16, b: 28 };

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(Math.max(300, Math.floor(e.contentRect.width)));
    });
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const maxV = Math.max(1, ...data.map(d => d.value));
  const minTs = data.length ? data[0].ts : 0;
  const maxTs = data.length ? data[data.length-1].ts : 1;

  const X = (ts: number) => pad.l + (w - pad.l - pad.r) * ((ts - minTs) / Math.max(1, maxTs - minTs));
  const Y = (v: number) => h - pad.b - (h - pad.t - pad.b) * (v / maxV);

  let path = "";
  data.forEach((p, i) => {
    const x = X(p.ts), y = Y(p.value);
    path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  });
  // area
  let area = path;
  if (data.length) {
    const lastX = X(data[data.length-1].ts);
    area += ` L ${lastX} ${Y(0)} L ${X(data[0].ts)} ${Y(0)} Z`;
  }

  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg width={w} height={h}>
        {/* grid */}
        {Array.from({length:4}).map((_,i) => {
          const yy = pad.t + (h - pad.t - pad.b) * (i/4);
          return <line key={i} x1={pad.l} y1={yy} x2={w-pad.r} y2={yy} stroke="var(--border-soft)" strokeWidth={1} />
        })}
        {/* axes */}
        <line x1={pad.l} y1={h-pad.b} x2={w-pad.r} y2={h-pad.b} stroke="var(--border-soft)" />
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={h-pad.b} stroke="var(--border-soft)" />

        {/* area fill */}
        <path d={area} fill="url(#grad)" opacity={0.4} />
        {/* line */}
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth={2} />

        {/* points */}
        {data.map((p,i) => (
          <circle key={i} cx={X(p.ts)} cy={Y(p.value)} r={3} fill="var(--primary)" />
        ))}

        <defs>
          <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function bucketize(data: Transaction[], mode: "day"|"week"|"month", metric: "sum"|"count"): BucketPoint[] {
  if (!data.length) return [];
  const norm = data.slice().sort((a,b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  const map = new Map<string, BucketPoint>();
  for (const t of norm) {
    const d = new Date(t.createdAt);
    const key = mode === "day" ? d.toISOString().slice(0,10) : mode === "week" ? yearWeek(d) : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const ts = mode === "day" ? new Date(key).getTime() : mode === "week" ? weekStartTs(d) : new Date(`${key}-01T00:00:00Z`).getTime();
    const bp = map.get(key) || { label: keyLabel(key, mode), ts, value: 0 };
    bp.value += (metric === "sum" ? t.amount : 1);
    map.set(key, bp);
  }
  return Array.from(map.values()).sort((a,b) => a.ts - b.ts);
}

function keyLabel(key: string, mode: "day"|"week"|"month") {
  if (mode === "day") return key.split("-").reverse().join(".");
  if (mode === "week") return `Неделя ${key.split('-W')[1]} ${key.slice(0,4)}`;
  const [y,m] = key.split('-');
  return `${m}.${y}`;
}

function yearWeek(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(),0,4));
  const week = 1 + Math.round(((date.getTime()-firstThursday.getTime())/86400000-3)/7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2,'0')}`;
}

function weekStartTs(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum);
  return date.getTime();
}

function buildInsights(data: Transaction[]) {
  const byCurrency = new Map<string, { sum: number; count: number }>();
  const byDay = new Map<string, { label: string; count: number }>();
  let sum = 0;
  for (const t of data) {
    sum += t.amount;
    const c = byCurrency.get(t.currency) || { sum: 0, count: 0 };
    c.sum += t.amount; c.count += 1; byCurrency.set(t.currency, c);
    const day = new Date(t.createdAt).toISOString().slice(0,10);
    const d = byDay.get(day) || { label: day.split('-').reverse().join('.'), count: 0 };
    d.count += 1; byDay.set(day, d);
  }
  const topCurrencyBySumKey = Array.from(byCurrency.entries()).sort((a,b)=>b[1].sum-a[1].sum)[0]?.[0] || "—";
  const topCurrencyByCountKey = Array.from(byCurrency.entries()).sort((a,b)=>b[1].count-a[1].count)[0]?.[0] || "—";
  const topDay = Array.from(byDay.values()).sort((a,b)=>b.count-a.count)[0] || { label:"—", count:0 };
  return {
    avgAmount: data.length ? sum / data.length : 0,
    topCurrencyBySum: { key: topCurrencyBySumKey, label: (currencyOptions as any).find((x:any)=>x.key===topCurrencyBySumKey)?.label || topCurrencyBySumKey },
    topCurrencyByCount: { key: topCurrencyByCountKey, label: (currencyOptions as any).find((x:any)=>x.key===topCurrencyByCountKey)?.label || topCurrencyByCountKey },
    topDay,
  };
}

function toggleSet<T>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, key: T) {
  setter(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
}
