"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getAdminSettings,
  getBankCommissionBalances,
  putAdminSettings,
} from "@/lib/api";
import {
  AdminSettings,
  BankCommissionBalanceSlot,
  BankCommissionBalances,
  BankCommissionGroupBalances,
} from "@/types";

type PartnerForm = {
  id: string;
  title: string;
  som_account: string;
  salam_wallet: string;
  usdt_wallet: string;
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatBalance(value: number | null, asset: string) {
  if (value == null) return "Баланс недоступен";
  const fractionDigits = asset === "SOM" ? 2 : 6;
  return `${value.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  })} ${asset}`;
}

function parsePartners(raw: string): PartnerForm[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item, index) => ({
        id:
          typeof item.id === "string" && item.id.trim()
            ? item.id.trim()
            : `partner-${index + 1}`,
        title:
          typeof item.title === "string" && item.title.trim()
            ? item.title.trim()
            : `Партнер ${index + 1}`,
        som_account:
          typeof item.som_account === "string" ? item.som_account : "",
        salam_wallet:
          typeof item.salam_wallet === "string" ? item.salam_wallet : "",
        usdt_wallet:
          typeof item.usdt_wallet === "string" ? item.usdt_wallet : "",
      }));
  } catch {
    return [];
  }
}

function serializePartners(partners: PartnerForm[]) {
  return JSON.stringify(
    partners.map((partner) => ({
      id: partner.id,
      title: partner.title.trim(),
      som_account: partner.som_account.trim(),
      salam_wallet: partner.salam_wallet.trim(),
      usdt_wallet: partner.usdt_wallet.trim(),
    })),
  );
}

function InfoHint({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <span className="flex h-6 w-6 cursor-help items-center justify-center rounded-full border border-soft bg-[var(--bg-soft)] text-xs font-semibold text-muted">
        ?
      </span>
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-xl border border-soft bg-[var(--card)] px-3 py-2 text-xs leading-5 text-fg opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
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
    <section className="card rounded-2xl border border-soft shadow-sm overflow-hidden">
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
          <div className="mt-1 text-xs text-muted break-all">
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

type ResourceFieldKey =
  | "central_bank_som_account"
  | "central_bank_salam_wallet"
  | "central_bank_usdt_wallet"
  | "bank_som_account"
  | "bank_salam_wallet"
  | "bank_usdt_wallet"
  | `partner:${string}:som_account`
  | `partner:${string}:salam_wallet`
  | `partner:${string}:usdt_wallet`;

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

export default function BankCommissionsPage() {
  const [settings, setSettings] = useState<AdminSettings>(EMPTY_SETTINGS);
  const [balances, setBalances] = useState<BankCommissionBalances>(EMPTY_BALANCES);
  const [partners, setPartners] = useState<PartnerForm[]>([]);
  const [editingFields, setEditingFields] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshingBalances, setRefreshingBalances] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const [settingsData, balanceData] = await Promise.all([
          getAdminSettings(),
          getBankCommissionBalances(),
        ]);
        if (!alive) return;
        setSettings(settingsData);
        setBalances(balanceData);
        setPartners(parsePartners(settingsData.bank_commission_partners_json || "[]"));
      } catch (err: unknown) {
        if (!alive) return;
        setError(getErrorMessage(err, "Не удалось загрузить раздел комиссий банка"));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const partnerBalancesById = useMemo(
    () => new Map(balances.partners.map((partner) => [partner.id, partner])),
    [balances.partners],
  );

  function updateSetting<K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function enableEditing(key: ResourceFieldKey) {
    setEditingFields((prev) => ({ ...prev, [key]: true }));
  }

  function isEditing(key: ResourceFieldKey) {
    return editingFields[key] === true;
  }

  function updatePartner(id: string, patch: Partial<PartnerForm>) {
    setPartners((prev) =>
      prev.map((partner) =>
        partner.id === id ? { ...partner, ...patch } : partner,
      ),
    );
  }

  function addPartner() {
    setPartners((prev) => [
      ...prev,
      {
        id: `partner-${Date.now()}-${prev.length + 1}`,
        title: `Партнер ${prev.length + 1}`,
        som_account: "",
        salam_wallet: "",
        usdt_wallet: "",
      },
    ]);
  }

  function removePartner(id: string) {
    setPartners((prev) => prev.filter((partner) => partner.id !== id));
    setEditingFields((prev) => {
      const next = { ...prev };
      delete next[`partner:${id}:som_account`];
      delete next[`partner:${id}:salam_wallet`];
      delete next[`partner:${id}:usdt_wallet`];
      return next;
    });
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
        bank_som_account: settings.bank_som_account.trim(),
        bank_salam_wallet: settings.bank_salam_wallet.trim(),
        bank_usdt_wallet: settings.bank_usdt_wallet.trim(),
        bank_commission_partners_json: serializePartners(partners),
      };

      const saved = await putAdminSettings(payload);
      const balanceData = await getBankCommissionBalances();
      setSettings((prev) => ({ ...prev, ...saved }));
      setBalances(balanceData);
      setPartners(parsePartners(saved.bank_commission_partners_json || "[]"));
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
      return (
        <BalanceCard
          title={label}
          slot={slot}
          onEdit={() => enableEditing(fieldKey)}
        />
      );
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
          subtitle="Укажите время, по которому будут зачисляться комиссии в часовом поясе Бишкека."
        >
          <TimeField
            value={settings.bank_fee_posting_time_bishkek}
            onChange={(value) => updateSetting("bank_fee_posting_time_bishkek", value)}
          />
        </SectionCard>

        <GroupGrid
          title="Комиссии ЦБ"
          subtitle="Сначала вводятся реквизиты, после сохранения здесь же показываются живые балансы."
          fields={
            <>
              {renderManagedField({
                label: "Спецсчет СОМ ЦБ",
                value: settings.central_bank_som_account,
                slot: balances.central_bank.som_account,
                fieldKey: "central_bank_som_account",
                onChange: (value) => updateSetting("central_bank_som_account", value),
                placeholder: "Введите номер спецсчета",
              })}
              {renderManagedField({
                label: "Кошелек SALAM",
                value: settings.central_bank_salam_wallet,
                slot: balances.central_bank.salam_wallet,
                fieldKey: "central_bank_salam_wallet",
                onChange: (value) => updateSetting("central_bank_salam_wallet", value),
                placeholder: "Введите адрес кошелька SALAM",
              })}
              {renderManagedField({
                label: "Кошелек USDT",
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
                label: "Спецсчет СОМ банка",
                value: settings.bank_som_account,
                slot: balances.bank.som_account,
                fieldKey: "bank_som_account",
                onChange: (value) => updateSetting("bank_som_account", value),
                placeholder: "Введите номер спецсчета",
              })}
              {renderManagedField({
                label: "Кошелек SALAM",
                value: settings.bank_salam_wallet,
                slot: balances.bank.salam_wallet,
                fieldKey: "bank_salam_wallet",
                onChange: (value) => updateSetting("bank_salam_wallet", value),
                placeholder: "Введите адрес кошелька SALAM",
              })}
              {renderManagedField({
                label: "Кошелек USDT",
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
          title="Партнеры"
          subtitle="Для каждого партнера можно сохранить отдельные реквизиты и потом видеть их балансы."
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted">
              <InfoHint text="Добавьте партнера, заполните его реквизиты и после сохранения вместо полей появятся балансы." />
              <span>Список партнерских реквизитов</span>
            </div>
            <button className="btn btn-primary h-10 px-4" type="button" onClick={addPartner}>
              Добавить партнера
            </button>
          </div>

          {partners.length ? (
            <div className="space-y-4">
              {partners.map((partner, index) => {
                const slotGroup: BankCommissionGroupBalances =
                  partnerBalancesById.get(partner.id) || {
                    som_account: null,
                    salam_wallet: null,
                    usdt_wallet: null,
                  };

                return (
                  <section
                    key={partner.id}
                    className="rounded-2xl border border-soft bg-[var(--card)] p-4"
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="grid gap-1">
                        <span className="text-xs text-muted">Название партнера</span>
                        <input
                          className="ui-input min-w-[260px]"
                          value={partner.title}
                          onChange={(e) =>
                            updatePartner(partner.id, { title: e.target.value })
                          }
                          placeholder={`Партнер ${index + 1}`}
                        />
                      </div>
                      <button
                        className="btn h-10 px-4 text-red-600"
                        type="button"
                        onClick={() => removePartner(partner.id)}
                      >
                        Удалить
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                      {renderManagedField({
                        label: "Спецсчет СОМ партнера",
                        value: partner.som_account,
                        slot: slotGroup.som_account,
                        fieldKey: `partner:${partner.id}:som_account`,
                        onChange: (value) =>
                          updatePartner(partner.id, { som_account: value }),
                        placeholder: "Введите номер спецсчета",
                      })}
                      {renderManagedField({
                        label: "Кошелек SALAM",
                        value: partner.salam_wallet,
                        slot: slotGroup.salam_wallet,
                        fieldKey: `partner:${partner.id}:salam_wallet`,
                        onChange: (value) =>
                          updatePartner(partner.id, { salam_wallet: value }),
                        placeholder: "Введите адрес кошелька SALAM",
                      })}
                      {renderManagedField({
                        label: "Кошелек USDT",
                        value: partner.usdt_wallet,
                        slot: slotGroup.usdt_wallet,
                        fieldKey: `partner:${partner.id}:usdt_wallet`,
                        onChange: (value) =>
                          updatePartner(partner.id, { usdt_wallet: value }),
                        placeholder: "Введите адрес USDT TRC20 кошелька",
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-soft bg-[var(--bg-soft)] px-4 py-8 text-center text-sm text-muted">
              Партнеры пока не добавлены. Нажмите «Добавить партнера», чтобы создать первый блок.
            </div>
          )}
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
