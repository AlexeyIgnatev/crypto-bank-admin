"use client";
import { useMemo, useState, useEffect } from "react";
import Modal from "@/components/Modal";
import { CustomerResidency, TariffCategory } from "@/types";
import { getTariffs, putTariffs, TariffOperation, TariffSetting } from "@/lib/api";

type Settings = {
  esom_per_usd: string;
  esom_som_conversion_fee_pct: string;
  esom_som_conversion_fee_min: string;
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

const TARIFF_CATEGORIES: TariffCategory[] = ["K1", "K2", "K3", "K4", "K5", "K6"];
const TARIFF_RESIDENCIES: { value: CustomerResidency; label: string }[] = [
  { value: "RESIDENT", label: "Резидент" },
  { value: "NON_RESIDENT", label: "Нерезидент" },
];
const TARIFF_OPERATIONS: { operation: TariffOperation; label: string }[] = [
  { operation: "ESOM_TO_BTC", label: "САЛАМ → BTC" },
  { operation: "ESOM_TO_USDT_TRC20", label: "САЛАМ → USDT" },
  { operation: "ESOM_TO_ETH", label: "САЛАМ → ETH" },
  { operation: "BTC_TO_ETH", label: "BTC → ETH" },
  { operation: "BTC_TO_USDT_TRC20", label: "BTC → USDT" },
  { operation: "USDT_TRC20_TO_ETH", label: "USDT → ETH" },
  { operation: "WALLET_TRANSFER_ESOM", label: "Перевод САЛАМ между пользователями" },
  { operation: "WALLET_TRANSFER_BTC", label: "Перевод BTC между пользователями" },
  { operation: "WALLET_TRANSFER_ETH", label: "Перевод ETH между пользователями" },
  { operation: "WALLET_TRANSFER_USDT_TRC20", label: "Перевод USDT между пользователями" },
];

export default function RatesPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tariffs, setTariffs] = useState<TariffSetting[]>([]);
  const [activeCategory, setActiveCategory] = useState<TariffCategory>("K1");
  const [activeResidency, setActiveResidency] = useState<CustomerResidency>("RESIDENT");
  const [savingTariffs, setSavingTariffs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await getSettings();
        const tariffRows = await getTariffs();
        if (alive) {
          setSettings(s as unknown as Settings);
          setTariffs(tariffRows);
        }
      } catch {
        setError("Не удалось загрузить настройки");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const [modal, setModal] = useState<{ open: boolean; key: keyof Settings | null; title: string; suffix?: string; step?: string; max?: string; maxDecimals?: number }>({ open: false, key: null, title: "" });
  const value = useMemo(() => (modal.key && settings ? settings[modal.key] : ""), [modal.key, settings]);

  const openEdit = (key: keyof Settings, title: string, opts?: { suffix?: string; step?: string; max?: string; maxDecimals?: number }) => setModal({ open: true, key, title, suffix: opts?.suffix, step: opts?.step, max: opts?.max, maxDecimals: opts?.maxDecimals });
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
              <SettingRow label="Конвертация СОМ ↔ САЛАМ" value={`${fmtPct(settings.esom_som_conversion_fee_pct)}`} onEdit={() => openEdit("esom_som_conversion_fee_pct", "Комиссия за конвертацию СОМ ↔ САЛАМ (%)", { suffix: "%", step: "0.01", max: "100", maxDecimals: 2 })} />
              <SettingRow label="Мин. комиссия конвертации СОМ ↔ САЛАМ" value={`${fmt(settings.esom_som_conversion_fee_min)} СОМ/САЛАМ`} onEdit={() => openEdit("esom_som_conversion_fee_min", "Минимальная комиссия конвертации СОМ ↔ САЛАМ", { step: "0.01" })} />
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
        <TariffsPanel
          tariffs={tariffs}
          activeCategory={activeCategory}
          activeResidency={activeResidency}
          saving={savingTariffs}
          onCategory={setActiveCategory}
          onResidency={setActiveResidency}
          onChange={(next) => setTariffs(next)}
          onSave={async () => {
            setSavingTariffs(true);
            try {
              const saved = await putTariffs(tariffs);
              setTariffs(saved);
            } finally {
              setSavingTariffs(false);
            }
          }}
        />
      </div>

      <EditModal open={modal.open} title={modal.title} value={value} suffix={modal.suffix} step={modal.step} max={modal.max} maxDecimals={modal.maxDecimals} onClose={closeEdit} onSave={saveValue} fieldKey={modal.key} />
    </div>
  );
}

function TariffsPanel({
  tariffs,
  activeCategory,
  activeResidency,
  saving,
  onCategory,
  onResidency,
  onChange,
  onSave,
}: {
  tariffs: TariffSetting[];
  activeCategory: TariffCategory;
  activeResidency: CustomerResidency;
  saving: boolean;
  onCategory: (value: TariffCategory) => void;
  onResidency: (value: CustomerResidency) => void;
  onChange: (value: TariffSetting[]) => void;
  onSave: () => Promise<void>;
}) {
  const rowFor = (operation: TariffOperation): TariffSetting => tariffs.find((item) =>
    item.category === activeCategory && item.residency === activeResidency && item.operation === operation
  ) || { category: activeCategory, residency: activeResidency, operation, percent_fee: "0", fixed_fee: "0" };

  const updateRow = (operation: TariffOperation, patch: Partial<Pick<TariffSetting, "percent_fee" | "fixed_fee">>) => {
    const exists = tariffs.some((item) => item.category === activeCategory && item.residency === activeResidency && item.operation === operation);
    const next = exists
      ? tariffs.map((item) => item.category === activeCategory && item.residency === activeResidency && item.operation === operation ? { ...item, ...patch } : item)
      : [...tariffs, { ...rowFor(operation), ...patch }];
    onChange(next);
  };

  return (
    <section className="mt-4 card rounded-xl border border-soft shadow-sm overflow-hidden">
      <header className="p-4 border-b border-soft flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Тарифная сетка клиентов</div>
            <div className="text-sm text-muted">Комиссия в процентах и фиксированная сумма по категории и резидентству</div>
          </div>
          <button className="btn btn-success h-9 px-4" onClick={onSave} disabled={saving}>
            {saving ? "Сохранение..." : "Сохранить тарифы"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {TARIFF_CATEGORIES.map((category) => (
            <button key={category} className={`btn h-8 ${activeCategory === category ? "btn-primary" : ""}`} onClick={() => onCategory(category)}>
              ТАРИФ {category}
            </button>
          ))}
          <div className="w-px bg-[var(--border-soft)] mx-1" />
          {TARIFF_RESIDENCIES.map((item) => (
            <button key={item.value} className={`btn h-8 ${activeResidency === item.value ? "btn-info" : ""}`} onClick={() => onResidency(item.value)}>
              {item.label}
            </button>
          ))}
        </div>
      </header>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--card)]">
            <tr className="border-b border-soft">
              <th className="text-left px-4 py-3">Тип транзакции</th>
              <th className="text-left px-4 py-3 w-44">Комиссия, %</th>
              <th className="text-left px-4 py-3 w-44">Фикс. сумма</th>
            </tr>
          </thead>
          <tbody>
            {TARIFF_OPERATIONS.map((item) => {
              const row = rowFor(item.operation);
              return (
                <tr key={item.operation} className="border-b border-soft">
                  <td className="px-4 py-3">{item.label}</td>
                  <td className="px-4 py-3">
                    <input
                      className="ui-input w-full"
                      inputMode="decimal"
                      value={row.percent_fee}
                      onChange={(e) => updateRow(item.operation, { percent_fee: normalizeDecimalInput(e.target.value, { max: "100", maxDecimals: 2 }) })}
                      onBlur={(e) => updateRow(item.operation, { percent_fee: formatFixed2(e.target.value) })}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className="ui-input w-full"
                      inputMode="decimal"
                      value={row.fixed_fee}
                      onChange={(e) => updateRow(item.operation, { fixed_fee: normalizeDecimalInput(e.target.value, { maxDecimals: 8 }) })}
                      placeholder="0"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
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

function EditModal({ open, onClose, onSave, title, value, suffix, step, max, maxDecimals, fieldKey }: { open: boolean; onClose: () => void; onSave: (v: string) => void; title: string; value: string; suffix?: string; step?: string; max?: string; maxDecimals?: number; fieldKey: keyof Settings | null; }) {
  const [v, setV] = useState<string>(value);
  const [err, setErr] = useState<string | null>(null);
  const isSomSalamPct = fieldKey === "esom_som_conversion_fee_pct";

  // reset input on open / field change
  const opened = open ? fieldKey + "" + title : "";
  useMemo(() => { if (open) { setV(value); setErr(null); } }, [opened, value, open]);

  const validate = (val: string) => {
    const s = sanitizeNumber(val);
    if (!s) return "Введите значение";
    const num = Number(s);
    if (!Number.isFinite(num)) return "Некорректное число";
    if (typeof maxDecimals === "number" && maxDecimals >= 0) {
      const parts = s.split(".");
      const decimals = parts.length > 1 ? (parts[1] || "").length : 0;
      if (decimals > maxDecimals) return `Допустимо не более ${maxDecimals} знаков после запятой`;
    }
    if (max != null && max !== "" && num > Number(max)) return `Значение не должно быть больше ${max}`;
    // percentage fields must be >= 0
    if (title.toLowerCase().includes("комиссия") && title.includes("%")) {
      if (num < 0) return "Процент не может быть отрицательным";
    }
    // fixed/amount fields must be >= 0
    if (!title.includes("%") && num < 0) return "Значение не может быть отрицательным";
    return null;
  };

  const onSaveClick = () => {
    const e = validate(v);
    if (e) { setErr(e); return; }
    const next = sanitizeNumber(v);
    onSave(isSomSalamPct ? Number(next).toFixed(2) : next);
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="text-muted">Значение{suffix ? `, ${suffix}` : ""}</span>
          <div className="flex items-center gap-2 mt-1">
            <input className={`ui-input w-full ${err ? 'border-red-500' : ''}`} inputMode="decimal" step={step} max={max} value={v} onChange={e => {
              const next = normalizeDecimalInput(e.target.value, { max, maxDecimals, fixedDecimals: isSomSalamPct ? 2 : undefined });
              setV(next);
              if (err) setErr(null);
            }} placeholder={isSomSalamPct ? "0.00" : "0"} />
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
function formatFixed2(value: string) {
  const n = Number(sanitizeNumber(value));
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), 100).toFixed(2) : "0.00";
}
function normalizeDecimalInput(value: string, opts: { max?: string; maxDecimals?: number; fixedDecimals?: number }) {
  let next = value.replace(/[^0-9.,]/g, "").replace(",", ".");
  const firstDot = next.indexOf(".");
  if (firstDot !== -1) {
    next = next.slice(0, firstDot + 1) + next.slice(firstDot + 1).replace(/\./g, "");
  }

  if (typeof opts.maxDecimals === "number" && opts.maxDecimals >= 0) {
    const [intPart, decimalPart] = next.split(".");
    if (decimalPart != null) next = `${intPart}.${decimalPart.slice(0, opts.maxDecimals)}`;
  }

  const max = opts.max != null && opts.max !== "" ? Number(opts.max) : null;
  const num = Number(next);
  if (max != null && Number.isFinite(num) && num > max) {
    return typeof opts.fixedDecimals === "number" ? max.toFixed(opts.fixedDecimals) : String(max);
  }

  return next;
}
