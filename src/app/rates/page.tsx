"use client";
import { useMemo, useState, useEffect } from "react";
import Modal from "@/components/Modal";

type Settings = {
  esom_per_usd: string;
  esom_som_conversion_fee_pct: string;
  btc_trade_fee_pct: string;
  eth_trade_fee_pct: string;
  usdt_trade_fee_pct: string;
  btc_withdraw_fee_fixed: string;
  eth_withdraw_fee_fixed: string;
  usdt_withdraw_fee_fixed: string;
  min_withdraw_btc: string;
  min_withdraw_eth: string;
  min_withdraw_usdt_trc20: string;
};

import { getSettings, putSettings } from "@/lib/api";

export default function RatesPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await getSettings();
        if (alive) setSettings(s as unknown as Settings);
      } catch {
        setError("Не удалось загрузить настройки");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const [modal, setModal] = useState<{ open: boolean; key: keyof Settings | null; title: string; suffix?: string; step?: string }>({ open: false, key: null, title: "" });
  const value = useMemo(() => (modal.key && settings ? settings[modal.key] : ""), [modal.key, settings]);

  const openEdit = (key: keyof Settings, title: string, opts?: { suffix?: string; step?: string }) => setModal({ open: true, key, title, suffix: opts?.suffix, step: opts?.step });
  const closeEdit = () => setModal({ open: false, key: null, title: "" });
  const saveValue = async (next: string) => {
    if (!modal.key || !settings) return;
    const updated = { ...settings, [modal.key]: sanitizeNumber(next) } as Settings;
    setSettings(updated);
    closeEdit();
    try {
      await putSettings(updated as any);
    } catch {
      // revert on failure?
    }
  };

  if (loading) return <div className="flex-1 grid place-items-center text-muted">Загрузка...</div>;
  if (error) return <div className="flex-1 grid place-items-center text-red-500">{error}</div>;
  if (!settings) return <div className="flex-1 grid place-items-center text-muted">Нет данных</div>;

  return (
    <div className="flex-1 min-h-0 flex">
      <div className="m-auto w-full max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="card rounded-xl border border-soft shadow-sm overflow-hidden">
            <header className="p-4 border-b border-soft flex items-center justify-between">
              <div className="text-lg font-semibold">Комиссии (в процентах)</div>
            </header>
            <div className="p-4 space-y-3">
              <SettingRow label="Курс САЛАМ за 1 USD" value={`${fmt2(settings.esom_per_usd)} САЛАМ`} onEdit={() => openEdit("esom_per_usd", "Курс САЛАМ за 1 USD", { step: "0.01" })} />
              <SettingRow label="Конвертация СОМ ↔ САЛАМ" value={`${fmtPct(settings.esom_som_conversion_fee_pct)}`} onEdit={() => openEdit("esom_som_conversion_fee_pct", "Комиссия за конвертацию СОМ ↔ САЛАМ (%)", { suffix: "%", step: "0.01" })} />
              <div className="pt-2 text-sm font-medium text-muted">Торговля</div>
              <SettingRow label="BTC торговая комиссия" value={`${fmtPct(settings.btc_trade_fee_pct)}`} onEdit={() => openEdit("btc_trade_fee_pct", "BTC торговая комиссия (%)", { suffix: "%", step: "0.01" })} />
              <SettingRow label="ETH торговая комиссия" value={`${fmtPct(settings.eth_trade_fee_pct)}`} onEdit={() => openEdit("eth_trade_fee_pct", "ETH торговая комиссия (%)", { suffix: "%", step: "0.01" })} />
              <SettingRow label="USDT торговая комиссия" value={`${fmtPct(settings.usdt_trade_fee_pct)}`} onEdit={() => openEdit("usdt_trade_fee_pct", "USDT торговая комиссия (%)", { suffix: "%", step: "0.01" })} />
            </div>
          </section>

          <section className="card rounded-xl border border-soft shadow-sm overflow-hidden">
            <header className="p-4 border-b border-soft flex items-center justify-between">
              <div className="text-lg font-semibold">Комиссии и минимумы вывода</div>
            </header>
            <div className="p-4 space-y-3">
              <div className="pt-0 text-sm font-medium text-muted">BTC</div>
              <SettingRow label="Фикс комиссия вывода BTC" value={`${fmt(settings.btc_withdraw_fee_fixed)} BTC`} onEdit={() => openEdit("btc_withdraw_fee_fixed", "Фикс комиссия вывода BTC", { step: "0.00000001" })} />
              <SettingRow label="Мин. сумма вывода BTC" value={`${fmt(settings.min_withdraw_btc)} BTC`} onEdit={() => openEdit("min_withdraw_btc", "Мин. сумма вывода BTC", { step: "0.00000001" })} />
              <div className="pt-2 text-sm font-medium text-muted">ETH</div>
              <SettingRow label="Фикс комиссия вывода ETH" value={`${fmt(settings.eth_withdraw_fee_fixed)} ETH`} onEdit={() => openEdit("eth_withdraw_fee_fixed", "Фикс комиссия вывода ETH", { step: "0.00000001" })} />
              <SettingRow label="Мин. сумма вывода ETH" value={`${fmt(settings.min_withdraw_eth)} ETH`} onEdit={() => openEdit("min_withdraw_eth", "Мин. сумма вывода ETH", { step: "0.00000001" })} />
              <div className="pt-2 text-sm font-medium text-muted">USDT (TRC20)</div>
              <SettingRow label="Фикс комиссия вывода USDT" value={`${fmt(settings.usdt_withdraw_fee_fixed)} USDT`} onEdit={() => openEdit("usdt_withdraw_fee_fixed", "Фикс комиссия вывода USDT (TRC20)", { step: "0.01" })} />
              <SettingRow label="Мин. сумма вывода USDT" value={`${fmt(settings.min_withdraw_usdt_trc20)} USDT`} onEdit={() => openEdit("min_withdraw_usdt_trc20", "Мин. сумма вывода USDT (TRC20)", { step: "0.01" })} />
            </div>
          </section>
        </div>
      </div>

      <EditModal open={modal.open} title={modal.title} value={value} suffix={modal.suffix} step={modal.step} onClose={closeEdit} onSave={saveValue} fieldKey={modal.key} />
    </div>
  );
}

function SettingRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-soft bg-[var(--card)]">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-muted text-sm truncate" title={value}>{value}</div>
      </div>
      <button className="btn btn-edit whitespace-nowrap" onClick={onEdit}>✎ Изменить</button>
    </div>
  );
}

function EditModal({ open, onClose, onSave, title, value, suffix, step, fieldKey }: { open: boolean; onClose: () => void; onSave: (v: string) => void; title: string; value: string; suffix?: string; step?: string; fieldKey: keyof Settings | null; }) {
  const [v, setV] = useState<string>(value);
  const [err, setErr] = useState<string | null>(null);

  // reset input on open / field change
  const opened = open ? fieldKey + "" + title : "";
  useMemo(() => { if (open) { setV(value); setErr(null); } }, [opened, value, open]);

  const validate = (val: string) => {
    const s = sanitizeNumber(val);
    if (!s) return "Введите значение";
    const num = Number(s);
    if (!Number.isFinite(num)) return "Некорректное число";
    // percentage fields must be >= 0
    if (title.toLowerCase().includes("комиссия") && title.includes("%")) {
      if (num < 0) return "Процент не может быть отрицательным";
      if (num > 1000) return "Слишком большой процент";
    }
    // fixed/amount fields must be >= 0
    if (!title.includes("%") && num < 0) return "Значение не может быть отрицательным";
    return null;
  };

  const onSaveClick = () => {
    const e = validate(v);
    if (e) { setErr(e); return; }
    onSave(sanitizeNumber(v));
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="text-muted">Значение{suffix ? `, ${suffix}` : ""}</span>
          <div className="flex items-center gap-2 mt-1">
            <input className={`ui-input w-full ${err ? 'border-red-500' : ''}`} inputMode="decimal" step={step} value={v} onChange={e => { setV(e.target.value); if (err) setErr(null); }} placeholder="0" />
            {suffix && <span className="px-2 text-sm text-muted">{suffix}</span>}
          </div>
        </label>
        {err && <div className="text-sm text-red-500">{err}</div>}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button className="btn h-9" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary h-9" onClick={onSaveClick}>Сохранить</button>
        </div>
      </div>
    </Modal>
  );
}

function fmt(x: string) { try { const n = Number(x); if (Number.isFinite(n)) return n.toLocaleString(); } catch {} return x; }
function fmt2(x: string) { try { const n = Number(x); if (Number.isFinite(n)) return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); } catch {} return x; }
function fmtPct(x: string) { try { const n = Number(x); if (Number.isFinite(n)) return `${n.toLocaleString()}%`; } catch {} return `${x}%`; }
function sanitizeNumber(x: string) { return x.replace(/[^0-9.,-]/g, "").replace(",", "."); }
