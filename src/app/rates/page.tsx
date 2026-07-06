"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getSettings,
  getTariffs,
  putSettings,
  putTariffs,
  TariffOperation,
  TariffSetting,
} from "@/lib/api";
import { CustomerResidency, TariffCategory } from "@/types";

const TARIFF_ROW_ORDER: { operation: TariffOperation; label: string }[] = [
  { operation: "SOM_TO_ESOM", label: "РљРѕРЅРІРµСЂС‚Р°С†РёСЏ РЎРћРњ РІ РЎРђР›РђРњ" },
  { operation: "ESOM_TO_SOM", label: "РљРѕРЅРІРµСЂС‚Р°С†РёСЏ РЎРђР›РђРњ РІ РЎРћРњ" },
  { operation: "WALLET_TRANSFER_ESOM", label: "РџРµСЂРµРІРѕРґ РЎРђР›РђРњ РјРµР¶РґСѓ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏРјРё" },
  { operation: "ESOM_TO_USDT_TRC20", label: "РљРѕРЅРІРµСЂС‚Р°С†РёСЏ РЎРђР›РђРњ РІ USDT TRC20" },
  { operation: "USDT_TRC20_TO_ESOM", label: "РљРѕРЅРІРµСЂС‚Р°С†РёСЏ USDT TRC20 РІ РЎРђР›РђРњ" },
  { operation: "WALLET_TRANSFER_USDT_TRC20", label: "РџРµСЂРµРІРѕРґ USDT TRC20 РјРµР¶РґСѓ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏРјРё" },
];

const LIMIT_SETTING_FIELDS = [
  {
    key: "usdt_withdraw_fee_fixed",
    label: "Р¤РёРєСЃ. РєРѕРјРёСЃСЃРёСЏ РІС‹РІРѕРґР° USDT TRC20",
  },
  {
    key: "min_withdraw_usdt_trc20",
    label: "РњРёРЅРёРјСѓРј РІС‹РІРѕРґР° USDT TRC20",
  },
] as const;

type SettingsState = Record<string, string>;

const EMPTY_SETTINGS: SettingsState = {
  esom_per_usd: "0",
  esom_som_conversion_fee_pct: "0",
  esom_som_conversion_fee_min: "0",
  usdt_trade_fee_pct: "0",
  usdt_withdraw_fee_fixed: "0",
  min_withdraw_usdt_trc20: "0",
};

const EMPTY_TARIFFS: TariffSetting[] = [];

function makeTariffKey(
  category: TariffCategory,
  residency: CustomerResidency,
  operation: TariffOperation,
) {
  return `${category}:${residency}:${operation}`;
}

function normalizeDecimalInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "0";
  return trimmed.replace(",", ".");
}

function formatMoney(value: string | number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "вЂ”";
  return parsed.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: string | number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "вЂ”";
  return `${parsed.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}%`;
}

function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`card rounded-2xl border border-soft shadow-sm overflow-hidden ${className}`}
    >
      <header className="border-b border-soft px-5 py-4">
        <div className="text-lg font-semibold">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-muted">{subtitle}</div> : null}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function FieldRow({
  label,
  value,
  onChange,
  suffix,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid grid-cols-1 gap-2 rounded-xl border border-soft bg-[var(--bg-soft)] p-4 md:grid-cols-[1.3fr_0.7fr] md:items-center">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
      </div>
      <div className="flex items-center gap-2">
        <input
          className="ui-input w-full"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
        />
        {suffix ? <span className="text-sm text-muted shrink-0">{suffix}</span> : null}
      </div>
    </label>
  );
}

function TariffRowField({
  label,
  percent,
  fixed,
  onPercentChange,
  onFixedChange,
}: {
  label: string;
  percent: string;
  fixed: string;
  onPercentChange: (value: string) => void;
  onFixedChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border border-soft bg-[var(--bg-soft)] p-4 xl:grid-cols-[1.5fr_0.6fr_0.8fr] xl:items-center">
      <div className="min-w-0">
        <div className="text-sm font-semibold">{label}</div>
      </div>
      <label className="grid gap-1">
        <span className="text-xs text-muted">РџСЂРѕС†РµРЅС‚</span>
        <input
          className="ui-input"
          value={percent}
          onChange={(e) => onPercentChange(e.target.value)}
          inputMode="decimal"
          placeholder="0"
        />
      </label>
      <label className="grid gap-1">
        <span className="text-xs text-muted">Р¤РёРєСЃ СЃСѓРјРјР° РєРѕРјРёСЃСЃРёРё</span>
        <input
          className="ui-input"
          value={fixed}
          onChange={(e) => onFixedChange(e.target.value)}
          inputMode="decimal"
          placeholder="0"
        />
      </label>
    </div>
  );
}

export default function RatesPage() {
  const [settings, setSettings] = useState<SettingsState>(EMPTY_SETTINGS);
  const [tariffs, setTariffs] = useState<TariffSetting[]>(EMPTY_TARIFFS);
  const [category, setCategory] = useState<TariffCategory>("K1");
  const [residency, setResidency] = useState<CustomerResidency>("RESIDENT");
  const [loading, setLoading] = useState(true);
  const [savingCore, setSavingCore] = useState(false);
  const [savingPercent, setSavingPercent] = useState(false);
  const [savingLimits, setSavingLimits] = useState(false);
  const [savingTariffs, setSavingTariffs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [settingsData, tariffsData] = await Promise.all([
          getSettings(),
          getTariffs(),
        ]);
        if (!alive) return;
        setSettings((prev) => ({ ...prev, ...settingsData }));
        setTariffs(tariffsData);
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message || "РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РїСЂРѕС†РµРЅС‚С‹");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const currentTariffs = useMemo(() => {
    const map = new Map(
      tariffs
        .filter((item) => item.category === category && item.residency === residency)
        .map((item) => [item.operation, item] as const),
    );

    return TARIFF_ROW_ORDER.map((row) => {
      const item = map.get(row.operation);
      return (
        item || {
          category,
          residency,
          operation: row.operation,
          percent_fee: "0",
          fixed_fee: "0",
        }
      );
    });
  }, [category, residency, tariffs]);

  const coreRate = settings.esom_per_usd ?? "0";

  function updateSetting(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function updateTariff(operation: TariffOperation, patch: Partial<TariffSetting>) {
    setTariffs((prev) => {
      const idx = prev.findIndex(
        (item) =>
          item.category === category &&
          item.residency === residency &&
          item.operation === operation,
      );

      if (idx === -1) {
        return [
          ...prev,
          {
            category,
            residency,
            operation,
            percent_fee: patch.percent_fee ?? "0",
            fixed_fee: patch.fixed_fee ?? "0",
          },
        ];
      }

      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  async function saveCoreAndTariffs() {
    setError(null);
    setSuccess(null);
    setSavingCore(true);
    setSavingTariffs(true);
    try {
      const nextRate = normalizeDecimalInput(coreRate);
      const tariffsPayload = currentTariffs.map((item) => ({
        category: item.category,
        residency: item.residency,
        operation: item.operation,
        percent_fee: normalizeDecimalInput(item.percent_fee),
        fixed_fee: normalizeDecimalInput(item.fixed_fee),
      }));

      const [savedSettings, savedTariffs] = await Promise.all([
        putSettings({ esom_per_usd: nextRate }),
        putTariffs(tariffsPayload),
      ]);

      setSettings((prev) => ({ ...prev, ...savedSettings, esom_per_usd: nextRate }));
      setTariffs((prev) => {
        const merged = new Map(
          prev.map((item) => [
            makeTariffKey(item.category, item.residency, item.operation),
            item,
          ]),
        );
        for (const item of savedTariffs) {
          merged.set(
            makeTariffKey(item.category, item.residency, item.operation),
            item,
          );
        }
        return Array.from(merged.values());
      });
      setSuccess("РўР°СЂРёС„РЅР°СЏ СЃРµС‚РєР° СЃРѕС…СЂР°РЅРµРЅР°");
    } catch (err: any) {
      setError(err?.message || "РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ С‚Р°СЂРёС„РЅСѓСЋ СЃРµС‚РєСѓ");
    } finally {
      setSavingCore(false);
      setSavingTariffs(false);
    }
  }

  async function savePercentFees() {
    setError(null);
    setSuccess(null);
    setSavingPercent(true);
    try {
      const payload = {
        esom_som_conversion_fee_pct: normalizeDecimalInput(
          settings.esom_som_conversion_fee_pct ?? "0",
        ),
        usdt_trade_fee_pct: normalizeDecimalInput(settings.usdt_trade_fee_pct ?? "0"),
      };
      const saved = await putSettings(payload);
      setSettings((prev) => ({ ...prev, ...saved, ...payload }));
      setSuccess("Р‘Р»РѕРє РїСЂРѕС†РµРЅС‚РѕРІ СЃРѕС…СЂР°РЅС‘РЅ");
    } catch (err: any) {
      setError(err?.message || "РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ Р±Р»РѕРє РїСЂРѕС†РµРЅС‚РѕРІ");
    } finally {
      setSavingPercent(false);
    }
  }

  async function saveLimits() {
    setError(null);
    setSuccess(null);
    setSavingLimits(true);
    try {
      const payload = {
        esom_som_conversion_fee_min: normalizeDecimalInput(
          settings.esom_som_conversion_fee_min ?? "0",
        ),
        usdt_withdraw_fee_fixed: normalizeDecimalInput(
          settings.usdt_withdraw_fee_fixed ?? "0",
        ),
        min_withdraw_usdt_trc20: normalizeDecimalInput(
          settings.min_withdraw_usdt_trc20 ?? "0",
        ),
      };
      const saved = await putSettings(payload);
      setSettings((prev) => ({ ...prev, ...saved, ...payload }));
      setSuccess("Р‘Р»РѕРє РјРёРЅРёРјР°Р»СЊРЅС‹С… РєРѕРјРёСЃСЃРёР№ СЃРѕС…СЂР°РЅС‘РЅ");
    } catch (err: any) {
      setError(err?.message || "РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ Р±Р»РѕРє РјРёРЅРёРјР°Р»СЊРЅС‹С… РєРѕРјРёСЃСЃРёР№");
    } finally {
      setSavingLimits(false);
    }
  }

  if (loading) {
    return <div className="m-auto text-muted">Р—Р°РіСЂСѓР·РєР°...</div>;
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto pb-8">
      <div className="w-full max-w-[1500px] px-4">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="rounded-full border border-soft bg-card/80 px-4 py-2 text-sm text-muted">
            РќР°СЃС‚СЂРѕР№РєР° С‚Р°СЂРёС„РѕРІ Рё РєРѕРјРёСЃСЃРёР№ РґР»СЏ С‚РµРєСѓС‰РµР№ РІРёС‚СЂРёРЅС‹
          </div>
          {success ? (
            <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-600">
              {success}
            </div>
          ) : null}
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
          <Card
            title="РўР°СЂРёС„РЅР°СЏ СЃРµС‚РєР° РєР»РёРµРЅС‚РѕРІ"
            className="xl:order-1"
          >
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="grid gap-1">
                <span className="text-xs text-muted">РљР°С‚РµРіРѕСЂРёСЏ</span>
                <select
                  className="ui-input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TariffCategory)}
                >
                  {(["K1", "K2", "K3", "K4", "K5", "K6"] as TariffCategory[]).map(
                    (item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-muted">Р РµР·РёРґРµРЅС‚СЃС‚РІРѕ</span>
                <select
                  className="ui-input"
                  value={residency}
                  onChange={(e) =>
                    setResidency(e.target.value as CustomerResidency)
                  }
                >
                  <option value="RESIDENT">Р РµР·РёРґРµРЅС‚</option>
                  <option value="NON_RESIDENT">РќРµСЂРµР·РёРґРµРЅС‚</option>
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-muted">РљСѓСЂСЃ USD Рє РЎРћРњ</span>
                <input
                  className="ui-input"
                  value={coreRate}
                  onChange={(e) =>
                    updateSetting("esom_per_usd", e.target.value)
                  }
                  inputMode="decimal"
                  placeholder="0"
                />
              </label>
            </div>

            <div className="space-y-3">
              {currentTariffs.map((item, index) => (
                <TariffRowField
                  key={item.operation}
                  label={TARIFF_ROW_ORDER[index]?.label || item.operation}
                  percent={item.percent_fee}
                  fixed={item.fixed_fee}
                  onPercentChange={(value) =>
                    updateTariff(item.operation, { percent_fee: value })
                  }
                  onFixedChange={(value) =>
                    updateTariff(item.operation, { fixed_fee: value })
                  }
                />
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
              <button
                className="btn btn-primary h-10 px-4"
                onClick={saveCoreAndTariffs}
                disabled={savingCore || savingTariffs}
              >
                {savingCore || savingTariffs ? "РЎРѕС…СЂР°РЅРµРЅРёРµ..." : "РЎРѕС…СЂР°РЅРёС‚СЊ С‚Р°СЂРёС„С‹"}
              </button>
            </div>
          </Card>

        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card
            title="РљРѕРјРёСЃСЃРёРё Рё РјРёРЅРёРјСѓРјС‹ РІС‹РІРѕРґР°"
          >
            <div className="space-y-3">
              {LIMIT_SETTING_FIELDS.map((field) => (
                <FieldRow
                  key={field.key}
                  label={field.label}
                  value={settings[field.key] ?? "0"}
                  onChange={(value) => updateSetting(field.key, value)}
                  suffix={field.key.includes("min_withdraw") ? "USDT TRC20" : ""}
                />
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                className="btn btn-primary h-10 px-4"
                onClick={saveLimits}
                disabled={savingLimits}
              >
                {savingLimits ? "РЎРѕС…СЂР°РЅРµРЅРёРµ..." : "РЎРѕС…СЂР°РЅРёС‚СЊ Р±Р»РѕРє"}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}


