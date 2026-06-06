"use client";
/* eslint-disable react/jsx-key */

import Cards from "../components/Cards";
import Table from "../components/Table";
import Modal from "../components/Modal";
import UserDetails from "../components/UserDetails";
import { useState, useEffect, useRef, useCallback } from "react";
import { formatAmount2, formatAmount6 } from "@/lib/format";
import { Transaction, User, TransactionStatus } from "../types";
import { getSettings, getUserById, updateUser } from "@/lib/api";

type MainRatesSettings = {
  esom_per_usd?: string;
  esom_som_conversion_fee_pct?: string;
  btc_trade_fee_pct?: string;
  eth_trade_fee_pct?: string;
  usdt_trade_fee_pct?: string;
};

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function nowIso(): string {
  return new Date().toISOString();
}

export default function Home() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [rates, setRates] = useState<MainRatesSettings | null>(null);
  const [ratesError, setRatesError] = useState(false);
  const [cardsPeriod, setCardsPeriod] = useState<{ dateFrom?: string; dateTo?: string }>({
    dateFrom: startOfTodayIso(),
    dateTo: nowIso(),
  });
  const handlePeriodChange = useCallback((period: { dateFrom?: string; dateTo?: string }) => {
    setCardsPeriod((prev) => (
      prev.dateFrom === period.dateFrom && prev.dateTo === period.dateTo ? prev : period
    ));
  }, []);

  const [openUser, setOpenUser] = useState(false);
  const [openUserEdit, setOpenUserEdit] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const settings = await getSettings();
        if (alive) setRates(settings as MainRatesSettings);
      } catch {
        if (alive) setRatesError(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function openUserModalById(id: string) {
    try {
      const user = await getUserById(id);
      setSelectedUser(user);
      setOpenUser(true);
    } catch (_e) {
      // Если пользователь не найден - просто не открываем модалку
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
      <div className="shrink-0"><Cards dateFrom={cardsPeriod.dateFrom} dateTo={cardsPeriod.dateTo} /></div>
      <ExchangeRatesStrip settings={rates} error={ratesError} />
      <div className="min-h-0 flex-1 flex flex-col"><Table
        onOpen={(t) => { setSelected(t); setOpen(true); }}
        onPeriodChange={handlePeriodChange}
      /></div>
      <Modal open={open} onClose={() => setOpen(false)} title="Детали транзакции">
        {selected && (
          <div className="space-y-2 text-sm text-fg">
            <Row label="ID/tx_hash" value={selected.id} mono />
            <Row label="Статус" value={<StatusBadge status={selected.status} />} />
            <Row label="Дата" value={new Date(selected.createdAt).toLocaleString()} />
            <Row label="Сумма" value={`${formatAmount6(selected.amount)} ${selected.currency}`} />
            <Row label="Комиссия" value={formatAmount2(Number(selected.feeAmount || 0))} />
            <Row label="Отправитель" value={
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate" title={selected.sender}>{selected.sender}</span>
                {selected.senderCustomerId && (
                  <button
                    className="inline-flex items-center justify-center h-7 w-7 rounded-full ml-auto shrink-0 bg-blue-600 hover:bg-blue-500"
                    onClick={() => openUserModalById(String(selected.senderCustomerId))}
                    aria-label="Открыть профиль"
                    title="Открыть профиль"
                  >
                    <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true" className="pointer-events-none">
                      <path fill="#fff" fillRule="evenodd" d="M10 8a3 3 0 100-6 3 3 0 000 6zM3 14a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            } />
            <Row label="ID отправителя ABS" value={selected.senderAbsId || selected.senderCustomerId || "—"} mono />
            <Row label="Получатель" value={
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate" title={selected.recipient}>{selected.recipient}</span>
                {selected.recipientCustomerId && (
                  <button
                    className="inline-flex items-center justify-center h-7 w-7 rounded-full ml-auto shrink-0 bg-blue-600 hover:bg-blue-500"
                    onClick={() => openUserModalById(String(selected.recipientCustomerId))}
                    aria-label="Открыть профиль"
                    title="Открыть профиль"
                  >
                    <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true" className="pointer-events-none">
                      <path fill="#fff" fillRule="evenodd" d="M10 8a3 3 0 100-6 3 3 0 000 6zM3 14a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            } />
            <Row label="ID получателя ABS" value={selected.recipientAbsId || selected.recipientCustomerId || "—"} mono />
            <Row label="ID клиента ABS" value={selected.clientAbsId || selected.senderCustomerId || selected.recipientCustomerId || "—"} mono />
          </div>
        )}
      </Modal>
      <Modal open={openUser} onClose={() => setOpenUser(false)} title="Пользователь">
        {selectedUser && (
          <UserDetails user={selectedUser} onClose={() => setOpenUser(false)} onEdit={() => { setOpenUser(false); setOpenUserEdit(true); }} onDelete={() => setOpenUser(false)} />
        )}
      </Modal>

      <Modal open={openUserEdit} onClose={() => setOpenUserEdit(false)} title="Редактировать пользователя">
        {selectedUser && (
          <EditUserInline user={selectedUser} onCancel={() => setOpenUserEdit(false)} onSave={(next) => { setSelectedUser(next); setOpenUserEdit(false); }} />
        )}
      </Modal>
    </div>
  );
}

function ExchangeRatesStrip({ settings, error }: { settings: MainRatesSettings | null; error: boolean }) {
  const esomPerUsd = Number(settings?.esom_per_usd ?? NaN);
  const hasRate = Number.isFinite(esomPerUsd) && esomPerUsd > 0;
  const items = [
    { label: "USD → САЛАМ", value: hasRate ? `${fmtMoney(esomPerUsd)} САЛАМ` : "—" },
    { label: "USDT → САЛАМ", value: hasRate ? `${fmtMoney(esomPerUsd)} САЛАМ` : "—" },
    { label: "СОМ ↔ САЛАМ", value: `1:1${settings?.esom_som_conversion_fee_pct ? `, комиссия ${fmtPercent(settings.esom_som_conversion_fee_pct)}` : ""}` },
    { label: "Комиссии BTC / ETH / USDT", value: [
      fmtPercent(settings?.btc_trade_fee_pct),
      fmtPercent(settings?.eth_trade_fee_pct),
      fmtPercent(settings?.usdt_trade_fee_pct),
    ].join(" / ") },
  ];

  return (
    <section className="shrink-0 rounded-xl border border-soft bg-[var(--card)] shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-soft flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Актуальные курсы обмена</div>
          <div className="text-xs text-muted">{error ? "Не удалось загрузить настройки" : "Данные из blockchain-config/settings"}</div>
        </div>
        <a className="btn h-8 px-3 whitespace-nowrap" href="/rates">Открыть таблицу</a>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 divide-x divide-y xl:divide-y-0 divide-[var(--border-soft)]">
        {items.map((item) => (
          <div key={item.label} className="px-4 py-3 min-w-0">
            <div className="text-xs text-muted truncate" title={item.label}>{item.label}</div>
            <div className="text-sm font-semibold truncate" title={item.value}>{settings ? item.value : "Загрузка..."}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function fmtMoney(value: number) {
  return value.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPercent(value?: string) {
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}%` : "—";
}

function EditUserInline({ user, onCancel, onSave }: { user: User; onCancel: () => void; onSave: (u: User) => void; }) {
  const [lastName, setLastName] = useState(user.fullName.split(" ")[0] || "");
  const [firstName, setFirstName] = useState(user.fullName.split(" ")[1] || "");
  const [middleName, setMiddleName] = useState(user.fullName.split(" ")[2] || "");
  const [phone, setPhone] = useState(user.phone);
  const [email, setEmail] = useState(user.email);
  const [status, setStatus] = useState(user.status);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      setErr(null);
      setSubmitting(true);
      try {
        await updateUser(user.id, { firstName, lastName, middleName, phone, email, status });
        onSave({ ...user, fullName: [lastName, firstName, middleName].filter(Boolean).join(" "), phone, email, status });
      } catch (e: any) {
        setErr(e?.message || "Не удалось сохранить пользователя");
      } finally {
        setSubmitting(false);
      }
    }}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-sm mb-1">Фамилия</div>
          <input className="ui-input w-full" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
        <div>
          <div className="text-sm mb-1">Имя</div>
          <input className="ui-input w-full" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div className="col-span-2">
          <div className="text-sm mb-1">Отчество</div>
          <input className="ui-input w-full" value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder="(необязательно)" />
        </div>
        <div>
          <div className="text-sm mb-1">Телефон</div>
          <input className="ui-input w-full" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
        <div>
          <div className="text-sm mb-1">E-mail</div>
          <input className="ui-input w-full" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </div>
        <div className="col-span-2">
          <div className="text-sm mb-1">Статус</div>
          <select className="ui-input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option>Активен</option>
            <option>Заблокирован</option>
            <option>Фин контроль</option>
          </select>
        </div>
      </div>
      {err && <div className="text-sm text-red-500">{err}</div>}
      <div className="grid grid-cols-2 gap-2 pt-4">
        <button type="button" className="btn w-full h-9" onClick={onCancel} disabled={submitting}>Отмена</button>
        <button type="submit" className="btn btn-success w-full h-9" disabled={submitting}>{submitting ? "Сохранение..." : "Сохранить"}</button>
      </div>
    </form>
  );
}


function StatusBadge({ status }: { status: TransactionStatus }) {
  const cls = status === "SUCCESS" ? "badge-success" : status === "PENDING" ? "badge-warning" : status === "REJECTED" ? "badge-danger" : "badge-danger";
  const text = status === "SUCCESS" ? "Успешно" : status === "PENDING" ? "В ожидании" : status === "REJECTED" ? "Отклонено" : "Ошибка";
  return <span className={`badge ${cls} whitespace-nowrap`}>{text}</span>;
}

export function Row({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-3 items-center">
      <div className="text-muted">{label}</div>
      <div className={`col-span-2 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
function StatusEditor({ tx, onSave }: { tx: Transaction; onSave: (t: Transaction) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<TransactionStatus>(tx.status);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setValue(tx.status), [tx.status]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!(e.target instanceof Node)) return;
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const dirty = value !== tx.status;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="relative inline-flex items-center gap-2">
        <button
          ref={btnRef}
          className="inline-flex items-center gap-1.5 pl-0 pr-2 h-8 rounded-lg bg-transparent max-w-[220px]"
          onClick={() => setOpen(o => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <StatusBadge status={value} />
          <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 7l5 5 5-5H5z" fill="currentColor"/></svg>
        </button>
        {open && (
          <div ref={panelRef} className="absolute z-50 top-full left-0 mt-1 card border border-soft rounded-lg shadow-xl p-2 w-[220px]">
            <div className="space-y-1">
              {(["confirmed","pending","declined"] as TransactionStatus[]).map(s => (
                <button key={s} className={`w-full text-left px-2 py-2 rounded transition-colors duration-150 hover:bg-slate-100 dark:hover:bg-white/10 ${value===s?"bg-black/5 dark:bg-white/10":""}`}
                  onClick={() => { setValue(s); setOpen(false); }}>
                  <StatusBadge status={s} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {dirty && (
        <button
          className="inline-flex items-center justify-center h-7 w-7 rounded-full ml-auto shrink-0 bg-blue-600 hover:bg-blue-500"
          onClick={() => { onSave({ ...tx, status: value }); setOpen(false); }}
          title="Сохранить"
          aria-label="Сохранить"
        >
          <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true" className="pointer-events-none">
            <path fill="#fff" fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}



