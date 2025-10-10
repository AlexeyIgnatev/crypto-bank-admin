"use client";
import { useMemo, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/airbnb.css";
import { Russian } from "flatpickr/dist/l10n/ru.js";
import { TransactionStatus, OperationType } from "@/types";
import { useEffect } from "react";
import { getTransactions, getTransactionsStats } from "@/lib/api";
import {
  ResponsiveContainer,
  AreaChart as RCAreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

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

// ---------- Helpers (defined before component to avoid hoisting issues) ----------
function buildInsights(data: Transaction[]) {
  const byCurrency = new Map<string, { sum: number; count: number }>();
  const byDay = new Map<string, { label: string; count: number }>();
  let sum = 0;
  for (const t of data) {
    sum += t.amount;
    const c = byCurrency.get(t.currency) || { sum: 0, count: 0 };
    c.sum += t.amount;
    c.count += 1;
    byCurrency.set(t.currency, c);
    const day = new Date(t.createdAt).toISOString().slice(0, 10);
    const d = byDay.get(day) || { label: day.split("-").reverse().join("."), count: 0 };
    d.count += 1;
    byDay.set(day, d);
  }
  const topCurrencyBySumKey = Array.from(byCurrency.entries()).sort((a, b) => b[1].sum - a[1].sum)[0]?.[0] || "COM";
  const topCurrencyByCountKey = Array.from(byCurrency.entries()).sort((a, b) => b[1].count - a[1].count)[0]?.[0] || "COM";
  const topDay = Array.from(byDay.values()).sort((a, b) => b.count - a.count)[0] || { label: "—", count: 0 };
  return {
    avgAmount: data.length ? sum / data.length : 0,
    topCurrencyBySum: { key: topCurrencyBySumKey, label: (currencyOptions as any).find((x: any) => x.key === topCurrencyBySumKey)?.label || topCurrencyBySumKey },
    topCurrencyByCount: { key: topCurrencyByCountKey, label: (currencyOptions as any).find((x: any) => x.key === topCurrencyByCountKey)?.label || topCurrencyByCountKey },
    topDay,
  };
}

function yearWeek(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function weekStartTs(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum);
  return date.getTime();
}

function mkBuckets(data: Transaction[], mode: "day" | "week" | "month", metric: "sum" | "count") {
  if (!data.length) return [] as { label: string; ts: number; value: number }[];
  const norm = data.slice().sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  const map = new Map<string, { label: string; ts: number; value: number }>();
  for (const t of norm) {
    const d = new Date(t.createdAt);
    const key = mode === "day" ? d.toISOString().slice(0, 10) : mode === "week" ? yearWeek(d) : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const ts = mode === "day" ? new Date(key).getTime() : mode === "week" ? weekStartTs(d) : new Date(`${key}-01T00:00:00Z`).getTime();
    const label = mode === "day" ? key.split("-").reverse().join(".") : mode === "week" ? `Неделя ${key.split("-W")[1]} ${key.slice(0, 4)}` : `${key.split("-")[1]}.${key.split("-")[0]}`;
    const bp = map.get(key) || { label, ts, value: 0 };
    bp.value += metric === "sum" ? t.amount : 1;
    map.set(key, bp);
  }
  return Array.from(map.values()).sort((a, b) => a.ts - b.ts);
}

// ---------- Page ----------
export default function TransactionsAnalytics() {
  // Данные теперь берём с бэкенда через getTransactions/getTransactionsStats

  // filters
  const [dateFrom, setDateFrom] = useState<string | undefined>(() => new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString());
  const [dateTo, setDateTo] = useState<string | undefined>(() => new Date().toISOString());
  const [statuses, setStatuses] = useState<Set<TransactionStatus>>(new Set());
  const [currencies, setCurrencies] = useState<Set<string>>(new Set());
  const [operations, setOperations] = useState<Set<OperationType>>(new Set());
  const [metric, setMetric] = useState<"sum" | "count">("sum");
  const [bucket, setBucket] = useState<"day" | "week" | "month">("day");

  // Загрузка первой страницы и статистики для графика
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ points: { ts: number; label: string; value: number }[]; totalSum: number; totalCount: number }>({ points: [], totalSum: 0, totalCount: 0 });

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const res = await getTransactions({
          offset: 0,
          limit: 1,
          dateFrom,
          dateTo,
          statuses: statuses.size ? Array.from(statuses) : undefined,
          currencies: currencies.size ? Array.from(currencies) : undefined,
        });
        setRows(res.items);
        setTotal(res.total);
      } finally {
        setLoading(false);
      }
    })();
  }, [dateFrom, dateTo, statuses, currencies]);

  useEffect(() => {
    (async () => {
      const s = await getTransactionsStats({
        dateFrom,
        dateTo,
        statuses: statuses.size ? Array.from(statuses) : undefined,
        currencies: currencies.size ? Array.from(currencies) : undefined,
        operations: operations.size ? Array.from(operations) : undefined,
        metric,
        bucket,
      });
      setStats(s);
    })();
  }, [dateFrom, dateTo, statuses, currencies, operations, metric, bucket]);

  // Экспорт CSV текущих точек графика
  function exportCsv() {
    const points = stats.points || [];
    if (!points.length) return;
    const sep = ",";
    const safe = (v: string | number) => {
      const s = String(v ?? "");
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const valHeader = metric === "sum" ? "Сумма" : "Кол-во";
    const header = ["Дата", "Timestamp", valHeader].join(sep);
    const rows = points.map(p => [safe(p.label), safe(p.ts), safe(p.value)].join(sep)).join("\n");
    const csv = header + "\n" + rows + "\n";
    const fmt = (d?: string) => {
      if (!d) return "";
      const x = new Date(d);
      const y = x.getFullYear();
      const m = String(x.getMonth() + 1).padStart(2, "0");
      const dd = String(x.getDate()).padStart(2, "0");
      return `${y}${m}${dd}`;
    };
    const name = `transactions_chart_${metric}_${bucket}_${fmt(dateFrom)}_${fmt(dateTo)}.csv`;
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }); // BOM for Excel
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden w-full">
      <div className="card border border-soft rounded-xl p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <DateRange from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />

          <Field label="Статус">
            <div className="flex flex-wrap gap-2">
              {[
                { key: "SUCCESS", label: "Успешно", cls: "status-success" },
                { key: "PENDING", label: "В ожидании", cls: "status-pending" },
                { key: "REJECTED", label: "Отклонено", cls: "status-rejected" },
                { key: "FAILED", label: "Ошибка", cls: "status-failed" },
              ].map(opt => (
                <button key={opt.key}
                  className={`pill status ${opt.cls}`}
                  aria-pressed={(statuses as unknown as Set<string>).has(opt.key)}
                  onClick={() => toggleSet(setStatuses, opt.key as TransactionStatus)}
                >
                  <span className="dot" />{opt.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Валюты">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: "COM", label: "СОМ", icon: "som" },
                  { key: "SALAM", label: "САЛАМ", icon: "som" },
                  { key: "BTC", label: "BTC", icon: "btc" },
                  { key: "ETH", label: "ETH", icon: "eth" },
                  { key: "USDT", label: "USDT", icon: "usdt" },
                ] as {key:string; label:string; icon: "som"|"btc"|"eth"|"usdt"}[]
              ).map(opt => (
                <button key={opt.key} className="chip" aria-pressed={currencies.has(opt.key)} onClick={() => toggleSet(setCurrencies, opt.key)}>
                  <span className="icon" aria-hidden>
                    {opt.icon === "som" ? (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M8 12h8M12 7v10" />
                      </svg>
                    ) : opt.icon === "btc" ? (
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" fill="#F7931A" />
                        <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">₿</text>
                      </svg>
                    ) : opt.icon === "eth" ? (
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                        <defs>
                          <linearGradient id="ethg" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#627EEA" />
                            <stop offset="100%" stopColor="#4C6EF5" />
                          </linearGradient>
                        </defs>
                        <polygon points="12,2 19,12 12,16 5,12" fill="url(#ethg)" />
                        <polygon points="12,22 19,14 12,18 5,14" fill="#6C8CFF" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" fill="#26A17B" />
                        <rect x="7" y="10.5" width="10" height="2" rx="1" fill="#fff" />
                        <rect x="11" y="6" width="2" height="8" rx="1" fill="#fff" />
                      </svg>
                    )}
                  </span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Тип операции">
            <div className="flex flex-wrap gap-2">
              {([
                { key: "bank", label: "Банк (СОМ/САЛАМ)", svg: (
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10l9-6 9 6"/><path d="M9 22V12h6v10"/><path d="M21 22H3"/></svg>
                ) },
                { key: "crypto", label: "Крипто", svg: (
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 2l9 5v10l-9 5-9-5V7l9-5zm0 3.2L6 8v8l6 3.2 6-3.2V8l-6-2.8z"/></svg>
                ) },
                { key: "exchange", label: "Обмен", svg: (
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h11l-3-3"/><path d="M20 17H9l3 3"/></svg>
                ) },
              ] as {key: OperationType; label: string; svg: JSX.Element}[]).map(opt => (
                <button key={opt.key} className="chip" aria-pressed={operations.has(opt.key)} onClick={() => toggleSet(setOperations, opt.key)}>
                  <span className="icon" aria-hidden>{opt.svg}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Метрика">
            <Segment value={metric} onChange={setMetric} options={[{ key: "sum", label: "Сумма" }, { key: "count", label: "Кол-во" }]} />
          </Field>
          <Field label="Группировка">
            <Segment value={bucket} onChange={setBucket} options={[{ key: "day", label: "Дни" }, { key: "week", label: "Недели" }, { key: "month", label: "Месяцы" }]} />
          </Field>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-0 flex-1">
        <div className="lg:col-span-4 card border border-soft rounded-xl p-3 flex flex-col min-h-[460px]">
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-semibold">Статистика</div>
            <div className="text-sm text-muted">{metric === "sum" ? "Сумма переводов" : "Количество переводов"}</div>
          </div>
          <div className="flex-1 min-h-[320px]">
            <InteractiveChart data={stats.points} metric={metric} />
          </div>
        </div>
        <div className="lg:col-span-1 card border border-soft rounded-xl p-3 flex flex-col min-h-[460px]">
          <div className="space-y-3 flex-1">
            <Stat label="Общая сумма" value={stats.totalSum.toLocaleString(undefined, { minimumFractionDigits: 2 })} suffix="" />
            <Stat label="Общее количество" value={stats.totalCount.toLocaleString()} />
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Топ валюта по сумме" value={stats.topCurrencyBySumLabel || "—"} />
              <Stat label="Топ валюта по количеству" value={stats.topCurrencyByCountLabel || "—"} />
              <Stat label="Наиболее активный день" value={stats.mostActiveDayLabel || "—"} />
              <Stat label="Средний чек" value={Math.round(stats.averageCheck).toLocaleString()} />
            </div>
          </div>
          <div className="pt-3 mt-2 border-t border-soft">
            <button className="btn btn-primary w-full h-12 text-base font-semibold" onClick={exportCsv} disabled={!stats.points?.length}>Экспорт CSV</button>
          </div>
        </div>
      </div>

    </div>
  );
}

// ---------- Small UI components ----------
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted mb-1">{label}</div>
      {children}
    </div>
  );
}

function DateRange({ from, to, onFrom, onTo }: { from?: string; to?: string; onFrom: (v?: string) => void; onTo: (v?: string) => void }) {
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

function MultiChips({ options, selected, onToggle }: { options: { key: string; label: string }[]; selected: Set<string>; onToggle: (key: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button key={opt.key} className="pill" aria-pressed={selected.has(opt.key)} onClick={() => onToggle(opt.key)}>
          <span className="dot" />
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Segment<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { key: T; label: string }[] }) {
  return (
    <div className="segment">
      {options.map((opt) => (
        <button key={opt.key} aria-pressed={value === opt.key} onClick={() => onChange(opt.key)}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="p-2 rounded-xl border border-soft">
      <div className="text-[11px] text-muted mb-1 leading-none">{label}</div>
      <div className="text-xl font-semibold break-any leading-tight">
        {value}
        {suffix ? ` ${suffix}` : ""}
      </div>
    </div>
  );
}

// ---------- Chart ----------
type BucketPoint = { label: string; ts: number; value: number };

function InteractiveChart({ data, metric }: { data: BucketPoint[]; metric: "sum" | "count" }) {
  const yLabel = metric === "sum" ? "Сумма" : "Кол-во";

  // Compact for big sums; integers for count. This stabilizes widths.
  const useCompact = metric === "sum";
  const fmt = (v: number) =>
    useCompact
      ? new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(v)
      : new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(v);

  // Dynamic Y-axis width from the widest formatted value
  const maxV = data.length ? Math.max(...data.map((p) => p.value)) : 0;
  const yAxisWidth = Math.min(120, Math.max(40, fmt(maxV).length * 8 + 16));

  const chartMargins = { top: 8, right: 16, bottom: 32, left: 16 } as const;
  // Вернул позиционирование подписи "Дата" как было
  const xLabelOffset = -6;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RCAreaChart data={data} margin={chartMargins}>
        <defs>
          <linearGradient id="rcGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border-soft)" vertical={false} />
        <XAxis
          dataKey="label"
          tickMargin={8}
          stroke="var(--muted)"
          interval="preserveStartEnd"
          minTickGap={36}
          label={{ value: "Дата", position: "insideBottom", offset: xLabelOffset, fill: "var(--muted)" }}
        />
        <YAxis
          tickMargin={6}
          stroke="var(--muted)"
          width={yAxisWidth}
          interval="preserveStartEnd"
          tickFormatter={(v) => fmt(Number(v))}
          label={{ value: yLabel, angle: -90, position: "insideLeft", offset: -4, fill: "var(--muted)" }}
        />
        <Tooltip content={<ChartTooltip labelKey={yLabel} fmt={fmt} />} />
        {/* Legend is not needed for single series */}
        <Area type="monotone" dataKey="value" name={yLabel} stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} fill="url(#rcGrad)" />
      </RCAreaChart>
    </ResponsiveContainer>
  );
}

function ChartTooltip({ active, payload, label, labelKey, fmt }: any) {
  if (!active || !payload || !payload.length) return null;
  const v = payload[0].value as number;
  return (
    <div style={{ background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border-soft)", borderRadius: 8, padding: "8px 10px", boxShadow: "0 4px 14px rgba(0,0,0,.08)", minWidth: 160, whiteSpace: "nowrap" }}>
      <div style={{ fontSize: 12, opacity: .7, marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, background: "var(--primary)", borderRadius: 999 }} />
        <span style={{ fontSize: 12, opacity: .8 }}>{labelKey}:</span>
        <strong style={{ fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{fmt(v)}</strong>
      </div>
    </div>
  );
}

function toggleSet<T>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, key: T) {
  setter((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
}
