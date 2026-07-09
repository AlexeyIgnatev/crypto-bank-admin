"use client";

import { useEffect, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  getAdminSettings,
  getBankCommissionBalances,
  putAdminSettings,
} from "@/lib/api";
import {
  AdminSettings,
  BankCommissionBalanceSlot,
  BankCommissionBalances,
} from "@/types";

type PartnerForm = {
  id: string;
  title: string;
  som_account: string;
  salam_wallet: string;
  usdt_wallet: string;
};

const EMPTY_PARTNER: PartnerForm = {
  id: "partner-1",
  title: "Партнер 1",
  som_account: "",
  salam_wallet: "",
  usdt_wallet: "",
};

const EMPTY_SETTINGS: AdminSettings = {
  esom_per_usd: "0",
  esom_som_conversion_fee_pct: "0",
  esom_som_conversion_fee_min: "0",
  usdt_trade_fee_pct: "0",
  usdt_withdraw_fee_fixed: "0",
  min_withdraw_usdt_trc20: "0",
  rates_change_reasons_json: "",
  bank_fee_posting_time_bishkek: "",
  central_bank_som_account: "",
  central_bank_salam_wallet: "",
  central_bank_usdt_wallet: "",
  bank_commission_central_bank_pct: "20",
  bank_commission_bank_pct: "40",
  bank_commission_partners_pct: "40",
  bank_som_account: "",
  bank_salam_wallet: "",
  bank_usdt_wallet: "",
  bank_commission_partners_json: "[]",
};

const EMPTY_BALANCES: BankCommissionBalances = {
  posting_time_bishkek: "",
  central_bank: {
    som_account: null,
    salam_wallet: null,
    usdt_wallet: null,
  },
  bank: {
    som_account: null,
    salam_wallet: null,
    usdt_wallet: null,
  },
  partners: [],
};

type ResourceFieldKey =
  | "central_bank_som_account"
  | "central_bank_salam_wallet"
  | "central_bank_usdt_wallet"
  | "bank_commission_central_bank_pct"
  | "bank_commission_bank_pct"
  | "bank_commission_partners_pct"
  | "bank_som_account"
  | "bank_salam_wallet"
  | "bank_usdt_wallet"
  | "partner_som_account"
  | "partner_salam_wallet"
  | "partner_usdt_wallet";

type CommissionSplit = {
  central: string;
  bank: string;
  partners: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function parsePercent(value: string): number {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function formatPercent(value: number): string {
  const rounded = Math.round(clampPercent(value) * 100) / 100;
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function formatBalance(value: number | null, asset: string) {
  if (value == null) return "Баланс недоступен";
  const fractionDigits = asset === "SOM" ? 2 : 6;
  return `${value.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  })} ${asset}`;
}

function parsePartner(raw: string): PartnerForm {
  if (!raw.trim()) return EMPTY_PARTNER;
  try {
    const parsed = JSON.parse(raw);
    const item = Array.isArray(parsed) ? parsed[0] : parsed;
    if (!item || typeof item !== "object") return EMPTY_PARTNER;
    return {
      id:
        typeof item.id === "string" && item.id.trim()
          ? item.id.trim()
          : EMPTY_PARTNER.id,
      title:
        typeof item.title === "string" && item.title.trim()
          ? item.title.trim()
          : EMPTY_PARTNER.title,
      som_account: typeof item.som_account === "string" ? item.som_account : "",
      salam_wallet: typeof item.salam_wallet === "string" ? item.salam_wallet : "",
      usdt_wallet: typeof item.usdt_wallet === "string" ? item.usdt_wallet : "",
    };
  } catch {
    return EMPTY_PARTNER;
  }
}

function serializePartner(partner: PartnerForm) {
  return JSON.stringify([
    {
      id: partner.id,
      title: partner.title.trim(),
      som_account: partner.som_account.trim(),
      salam_wallet: partner.salam_wallet.trim(),
      usdt_wallet: partner.usdt_wallet.trim(),
    },
  ]);
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card overflow-hidden rounded-2xl border border-soft shadow-sm">
      <header className="border-b border-soft px-5 py-4">
        <div className="text-lg font-semibold">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-muted">{subtitle}</div> : null}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function TimeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs text-muted">Время зачислений комиссий по Бишкеку</span>
      <input
        className="ui-input max-w-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Например: 09:00"
      />
    </label>
  );
}

function BalanceCard({
  title,
  slot,
  onEdit,
}: {
  title: string;
  slot: BankCommissionBalanceSlot | null;
  onEdit: () => void;
}) {
  return (
    <div className="rounded-2xl border border-soft bg-[var(--bg-soft)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-1 break-all text-xs text-muted">
            {slot?.reference || "Реквизит сохранен"}
          </div>
        </div>
        <button className="btn h-9 px-3" type="button" onClick={onEdit}>
          Изменить
        </button>
      </div>
      <div className="mt-4 text-2xl font-semibold">
        {slot ? formatBalance(slot.balance, slot.asset) : "Баланс появится после сохранения"}
      </div>
      {slot?.error ? (
        <div className="mt-2 text-xs text-red-600">
          Не удалось получить баланс: {slot.error}
        </div>
      ) : null}
    </div>
  );
}

function InlineField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs text-muted">{label}</span>
      <input
        className="ui-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function GroupGrid({
  title,
  subtitle,
  fields,
}: {
  title: string;
  subtitle?: string;
  fields: React.ReactNode;
}) {
  return (
    <SectionCard title={title} subtitle={subtitle}>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">{fields}</div>
    </SectionCard>
  );
}

function CommissionSplitPanel({
  value,
  onCentralChange,
  onBankChange,
  onPartnersChange,
}: {
  value: CommissionSplit;
  onCentralChange: (value: string) => void;
  onBankChange: (value: string) => void;
  onPartnersChange: (value: string) => void;
}) {
  const data = [
    {
      name: "ЦБ",
      value: clampPercent(parsePercent(value.central)),
      color: "#2563eb",
    },
    {
      name: "Банк",
      value: clampPercent(parsePercent(value.bank)),
      color: "#f97316",
    },
    {
      name: "Партнеры",
      value: clampPercent(parsePercent(value.partners)),
      color: "#10b981",
    },
  ];

  return (
    <div className="grid items-start gap-2 rounded-2xl border border-soft bg-[var(--bg-soft)] p-3 xl:grid-cols-[180px_1fr]">
      <div className="grid gap-3">
        <div className="grid gap-1">
          <span className="text-xs text-muted">ЦБ, %</span>
          <input
            className="ui-input"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={value.central}
            onChange={(e) => onCentralChange(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-muted">Банк, %</span>
          <input
            className="ui-input"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={value.bank}
            onChange={(e) => onBankChange(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-muted">Партнеры, %</span>
          <input
            className="ui-input"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={value.partners}
            onChange={(e) => onPartnersChange(e.target.value)}
          />
        </div>
        <div className="text-xs text-muted">
          Банк и партнеры всегда делят остаток комиссии 50/50.
        </div>
      </div>

      <div className="grid gap-2 self-start">
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={38}
                outerRadius={58}
                paddingAngle={2}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip
                formatter={(val: number) => [`${val}%`, "Доля"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid gap-2 text-sm text-muted sm:grid-cols-3">
          {data.map((entry) => (
            <div
              key={entry.name}
              className="rounded-xl border border-soft bg-white/60 p-2.5"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="font-medium text-foreground">{entry.name}</span>
              </div>
              <div className="mt-1 text-base font-semibold text-foreground">
                {entry.value.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BankCommissionsPage() {
  const [settings, setSettings] = useState<AdminSettings>(EMPTY_SETTINGS);
  const [balances, setBalances] = useState<BankCommissionBalances>(EMPTY_BALANCES);
  const [partner, setPartner] = useState<PartnerForm>(EMPTY_PARTNER);
  const [editingFields, setEditingFields] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshingBalances, setRefreshingBalances] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const [settingsResult, balanceResult] = await Promise.allSettled([
        getAdminSettings(),
        getBankCommissionBalances(),
      ]);

      if (!alive) return;

      if (settingsResult.status === "fulfilled") {
        setSettings(settingsResult.value);
        setPartner(
          parsePartner(settingsResult.value.bank_commission_partners_json || "[]"),
        );
      } else {
        setError(
          getErrorMessage(
            settingsResult.reason,
            "Не удалось загрузить admin settings",
          ),
        );
      }

      if (balanceResult.status === "fulfilled") {
        setBalances(balanceResult.value);
      } else if (settingsResult.status === "fulfilled") {
        setError(
          getErrorMessage(
            balanceResult.reason,
            "Не удалось загрузить балансы комиссий",
          ),
        );
      }

      if (alive) setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  const partnerBalance = balances.partners[0] || null;

  function updateSetting<K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function enableEditing(key: ResourceFieldKey) {
    setEditingFields((prev) => ({ ...prev, [key]: true }));
  }

  function isEditing(key: ResourceFieldKey) {
    return editingFields[key] === true;
  }

  function updatePartner(patch: Partial<PartnerForm>) {
    setPartner((prev) => ({ ...prev, ...patch }));
  }

  function setCommissionSplitFromCentral(raw: string) {
    const central = clampPercent(parsePercent(raw));
    const remainder = Math.max(100 - central, 0);
    const shared = clampPercent(remainder / 2);
    setSettings((prev) => ({
      ...prev,
      bank_commission_central_bank_pct: formatPercent(central),
      bank_commission_bank_pct: formatPercent(shared),
      bank_commission_partners_pct: formatPercent(shared),
    }));
  }

  function setCommissionSplitFromShared(raw: string) {
    const shared = clampPercent(Math.min(parsePercent(raw), 50));
    const central = clampPercent(100 - shared * 2);
    setSettings((prev) => ({
      ...prev,
      bank_commission_central_bank_pct: formatPercent(central),
      bank_commission_bank_pct: formatPercent(shared),
      bank_commission_partners_pct: formatPercent(shared),
    }));
  }

  async function refreshBalances() {
    setRefreshingBalances(true);
    try {
      const data = await getBankCommissionBalances();
      setBalances(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Не удалось обновить балансы"));
    } finally {
      setRefreshingBalances(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: Partial<AdminSettings> = {
        bank_fee_posting_time_bishkek: settings.bank_fee_posting_time_bishkek.trim(),
        central_bank_som_account: settings.central_bank_som_account.trim(),
        central_bank_salam_wallet: settings.central_bank_salam_wallet.trim(),
        central_bank_usdt_wallet: settings.central_bank_usdt_wallet.trim(),
        bank_commission_central_bank_pct:
          settings.bank_commission_central_bank_pct.trim(),
        bank_commission_bank_pct: settings.bank_commission_bank_pct.trim(),
        bank_commission_partners_pct: settings.bank_commission_partners_pct.trim(),
        bank_som_account: settings.bank_som_account.trim(),
        bank_salam_wallet: settings.bank_salam_wallet.trim(),
        bank_usdt_wallet: settings.bank_usdt_wallet.trim(),
        bank_commission_partners_json: serializePartner(partner),
      };

      const saved = await putAdminSettings(payload);
      const balanceData = await getBankCommissionBalances();
      setSettings((prev) => ({ ...prev, ...saved }));
      setBalances(balanceData);
      setPartner(parsePartner(saved.bank_commission_partners_json || "[]"));
      setEditingFields({});
      setSuccess("Настройки комиссий банка сохранены");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Не удалось сохранить настройки комиссий банка"));
    } finally {
      setSaving(false);
    }
  }

  function renderManagedField({
    label,
    value,
    slot,
    fieldKey,
    onChange,
    placeholder,
  }: {
    label: string;
    value: string;
    slot: BankCommissionBalanceSlot | null;
    fieldKey: ResourceFieldKey;
    onChange: (value: string) => void;
    placeholder: string;
  }) {
    if (value.trim() && !isEditing(fieldKey)) {
      return <BalanceCard title={label} slot={slot} onEdit={() => enableEditing(fieldKey)} />;
    }

    return (
      <InlineField
        label={label}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    );
  }

  if (loading) {
    return <div className="m-auto text-muted">Загрузка...</div>;
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto pb-8">
      <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-5 px-4">
        <section className="card rounded-2xl border border-soft px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-soft bg-[var(--bg-soft)] px-4 py-2 text-sm text-muted">
              Настройка реквизитов и живых остатков для начисления комиссий банка
            </div>
            {success ? (
              <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-600">
                {success}
              </div>
            ) : null}
            {error ? (
              <div className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-600">
                {error}
              </div>
            ) : null}
          </div>
        </section>

        <SectionCard
          title="Время зачисления"
          subtitle="Укажите время, по которому будут зачисляться комиссии в часовом поясе Бишкек."
        >
          <div className="grid items-start gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
            <TimeField
              value={settings.bank_fee_posting_time_bishkek}
              onChange={(value) =>
                updateSetting("bank_fee_posting_time_bishkek", value)
              }
            />
            <CommissionSplitPanel
              value={{
                central: settings.bank_commission_central_bank_pct,
                bank: settings.bank_commission_bank_pct,
                partners: settings.bank_commission_partners_pct,
              }}
              onCentralChange={setCommissionSplitFromCentral}
              onBankChange={setCommissionSplitFromShared}
              onPartnersChange={setCommissionSplitFromShared}
            />
          </div>
        </SectionCard>

        <GroupGrid
          title="Комиссии ЦБ"
          subtitle="Сначала вводятся реквизиты, после сохранения здесь же показываются живые балансы."
          fields={
            <>
              {renderManagedField({
                label: "Спецсчёт SOM ЦБ",
                value: settings.central_bank_som_account,
                slot: balances.central_bank.som_account,
                fieldKey: "central_bank_som_account",
                onChange: (value) => updateSetting("central_bank_som_account", value),
                placeholder: "Введите номер спецсчёта",
              })}
              {renderManagedField({
                label: "Кошелёк SALAM",
                value: settings.central_bank_salam_wallet,
                slot: balances.central_bank.salam_wallet,
                fieldKey: "central_bank_salam_wallet",
                onChange: (value) => updateSetting("central_bank_salam_wallet", value),
                placeholder: "Введите адрес кошелька SALAM",
              })}
              {renderManagedField({
                label: "Кошелёк USDT",
                value: settings.central_bank_usdt_wallet,
                slot: balances.central_bank.usdt_wallet,
                fieldKey: "central_bank_usdt_wallet",
                onChange: (value) => updateSetting("central_bank_usdt_wallet", value),
                placeholder: "Введите адрес USDT TRC20 кошелька",
              })}
            </>
          }
        />

        <GroupGrid
          title="Комиссии банка"
          subtitle="Отдельный блок для банковских комиссий и их реквизитов."
          fields={
            <>
              {renderManagedField({
                label: "Спецсчёт SOM банка",
                value: settings.bank_som_account,
                slot: balances.bank.som_account,
                fieldKey: "bank_som_account",
                onChange: (value) => updateSetting("bank_som_account", value),
                placeholder: "Введите номер спецсчёта",
              })}
              {renderManagedField({
                label: "Кошелёк SALAM",
                value: settings.bank_salam_wallet,
                slot: balances.bank.salam_wallet,
                fieldKey: "bank_salam_wallet",
                onChange: (value) => updateSetting("bank_salam_wallet", value),
                placeholder: "Введите адрес кошелька SALAM",
              })}
              {renderManagedField({
                label: "Кошелёк USDT",
                value: settings.bank_usdt_wallet,
                slot: balances.bank.usdt_wallet,
                fieldKey: "bank_usdt_wallet",
                onChange: (value) => updateSetting("bank_usdt_wallet", value),
                placeholder: "Введите адрес USDT TRC20 кошелька",
              })}
            </>
          }
        />

        <SectionCard
          title="Партнёры"
          subtitle="Здесь хранится один набор реквизитов партнёра: спецсчёт SOM, кошелёк SALAM и кошелёк USDT TRC20."
        >
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {renderManagedField({
              label: "Спецсчёт SOM партнёра",
              value: partner.som_account,
              slot: partnerBalance?.som_account || null,
              fieldKey: "partner_som_account",
              onChange: (value) => updatePartner({ som_account: value }),
              placeholder: "Введите номер спецсчёта",
            })}
            {renderManagedField({
              label: "Кошелёк SALAM",
              value: partner.salam_wallet,
              slot: partnerBalance?.salam_wallet || null,
              fieldKey: "partner_salam_wallet",
              onChange: (value) => updatePartner({ salam_wallet: value }),
              placeholder: "Введите адрес кошелька SALAM",
            })}
            {renderManagedField({
              label: "Кошелёк USDT TRC20",
              value: partner.usdt_wallet,
              slot: partnerBalance?.usdt_wallet || null,
              fieldKey: "partner_usdt_wallet",
              onChange: (value) => updatePartner({ usdt_wallet: value }),
              placeholder: "Введите адрес USDT TRC20 кошелька",
            })}
          </div>
        </SectionCard>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button className="btn h-10 px-4" type="button" onClick={refreshBalances}>
            {refreshingBalances ? "Обновление..." : "Обновить балансы"}
          </button>
          <button
            className="btn btn-primary h-10 px-4"
            type="button"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Сохранение..." : "Сохранить настройки"}
          </button>
        </div>
      </div>
    </div>
  );
}
