"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "@/components/Modal";
import {
  getAdminSettings,
  getTariffs,
  putAdminSettings,
  putTariffs,
  TariffOperation,
  TariffSetting,
} from "@/lib/api";
import { AdminSettings, CustomerResidency, TariffCategory } from "@/types";

type TariffGridRow =
  | {
      kind: "tariff";
      operation: TariffOperation;
      label: string;
    }
  | {
      kind: "external_usdt";
      label: string;
    };

type ReasonMap = Record<string, string>;

type PendingReasonItem = {
  key: string;
  label: string;
};

const TARIFF_GRID_ROWS: TariffGridRow[] = [
  { kind: "tariff", operation: "SOM_TO_ESOM", label: "Конвертация СОМ в SALAM" },
  { kind: "tariff", operation: "ESOM_TO_SOM", label: "Конвертация SALAM в СОМ" },
  {
    kind: "tariff",
    operation: "WALLET_TRANSFER_ESOM",
    label: "Перевод SALAM между пользователями",
  },
  {
    kind: "tariff",
    operation: "ESOM_TO_USDT_TRC20",
    label: "Конвертация SALAM в USDT TRC20",
  },
  {
    kind: "tariff",
    operation: "USDT_TRC20_TO_ESOM",
    label: "Конвертация USDT TRC20 в SALAM",
  },
  {
    kind: "tariff",
    operation: "WALLET_TRANSFER_USDT_TRC20",
    label: "Перевод USDT TRC20 между пользователями",
  },
  {
    kind: "external_usdt",
    label: "Перевод USDT TRC20 внешним пользователям",
  },
];

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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function parseReasons(raw: string): ReasonMap {
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as ReasonMap) : {};
  } catch {
    return {};
  }
}

function InfoHint({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <span className="flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-soft bg-[var(--bg-soft)] text-[10px] font-semibold text-muted">
        ?
      </span>
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-xl border border-soft bg-[var(--card)] px-3 py-2 text-xs leading-5 text-fg opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
        {text || "Причина изменения пока не указана."}
      </span>
    </span>
  );
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

function GridValue({
  label,
  value,
  onChange,
  suffix,
  placeholder = "0",
  disabled = false,
  muted = false,
  reason,
  showReason = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  suffix?: string;
  placeholder?: string;
  disabled?: boolean;
  muted?: boolean;
  reason?: string;
  showReason?: boolean;
}) {
  const labelNode = (
    <span className="flex items-center gap-2 text-xs text-muted">
      {showReason ? <InfoHint text={reason || "Причина изменения пока не указана."} /> : null}
      <span>{label}</span>
    </span>
  );

  if (disabled) {
    return (
      <div className="grid gap-1">
        {labelNode}
        <div
          className={`flex h-[42px] items-center rounded-lg border border-dashed border-soft px-3 text-sm ${
            muted ? "text-muted" : "text-fg"
          }`}
        >
          {value}
        </div>
      </div>
    );
  }

  return (
    <label className="grid gap-1">
      {labelNode}
      <div className="flex items-center gap-2">
        <input
          className="ui-input"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          inputMode="decimal"
          placeholder={placeholder}
        />
        {suffix ? <span className="shrink-0 text-sm text-muted">{suffix}</span> : null}
      </div>
    </label>
  );
}

function TariffGridRowCard({
  label,
  percent,
  fixed,
  minimum,
  reason,
  onPercentChange,
  onFixedChange,
  onMinimumChange,
  percentDisabled = false,
  minimumDisabled = false,
}: {
  label: string;
  percent: string;
  fixed: string;
  minimum: string;
  reason?: string;
  onPercentChange?: (value: string) => void;
  onFixedChange: (value: string) => void;
  onMinimumChange?: (value: string) => void;
  percentDisabled?: boolean;
  minimumDisabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border border-soft bg-[var(--bg-soft)] p-4 xl:grid-cols-[1.8fr_0.7fr_0.9fr_1fr] xl:items-center">
      <div className="min-w-0">
        <div className="text-sm font-semibold">{label}</div>
      </div>
      <GridValue
        label="Процент"
        value={percent}
        onChange={onPercentChange}
        disabled={percentDisabled}
        muted={percentDisabled}
        reason={reason}
        showReason={!percentDisabled}
      />
      <GridValue
        label="Комиссия"
        value={fixed}
        onChange={onFixedChange}
        reason={reason}
        showReason
      />
      <GridValue
        label="Минимум вывода USDT TRC20"
        value={minimum}
        onChange={onMinimumChange}
        disabled={minimumDisabled}
        muted={minimumDisabled}
        suffix={minimumDisabled ? undefined : "USDT"}
      />
    </div>
  );
}

export default function RatesPage() {
  const [settings, setSettings] = useState<AdminSettings>(EMPTY_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<AdminSettings>(EMPTY_SETTINGS);
  const [tariffs, setTariffs] = useState<TariffSetting[]>(EMPTY_TARIFFS);
  const [originalTariffs, setOriginalTariffs] = useState<TariffSetting[]>(EMPTY_TARIFFS);
  const [category, setCategory] = useState<TariffCategory>("K1");
  const [residency, setResidency] = useState<CustomerResidency>("RESIDENT");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reasons, setReasons] = useState<ReasonMap>({});
  const [pendingReasonItems, setPendingReasonItems] = useState<PendingReasonItem[]>([]);
  const [pendingReasonInputs, setPendingReasonInputs] = useState<ReasonMap>({});
  const [showReasonNotice, setShowReasonNotice] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const noticeShownRef = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [settingsData, tariffsData] = await Promise.all([
          getAdminSettings(),
          getTariffs(),
        ]);
        if (!alive) return;
        setSettings(settingsData);
        setOriginalSettings(settingsData);
        setTariffs(tariffsData);
        setOriginalTariffs(tariffsData);
        setReasons(parseReasons(settingsData.rates_change_reasons_json || ""));
      } catch (err: unknown) {
        if (!alive) return;
        setError(getErrorMessage(err, "Не удалось загрузить проценты"));
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

    return TARIFF_GRID_ROWS.filter(
      (row): row is Extract<TariffGridRow, { kind: "tariff" }> => row.kind === "tariff",
    ).map((row) => {
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

  const originalCurrentTariffs = useMemo(() => {
    const map = new Map(
      originalTariffs
        .filter((item) => item.category === category && item.residency === residency)
        .map((item) => [item.operation, item] as const),
    );

    return TARIFF_GRID_ROWS.filter(
      (row): row is Extract<TariffGridRow, { kind: "tariff" }> => row.kind === "tariff",
    ).map((row) => {
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
  }, [category, residency, originalTariffs]);

  const changedReasonItems = useMemo(() => {
    const items: PendingReasonItem[] = [];
    if (
      normalizeDecimalInput(settings.esom_per_usd) !==
      normalizeDecimalInput(originalSettings.esom_per_usd)
    ) {
      items.push({
        key: "rate:esom_per_usd",
        label: "Курс USD к СОМ",
      });
    }

    currentTariffs.forEach((item) => {
      const originalItem = originalCurrentTariffs.find(
        (candidate) => candidate.operation === item.operation,
      );
      const percentChanged =
        normalizeDecimalInput(item.percent_fee) !==
        normalizeDecimalInput(originalItem?.percent_fee ?? "0");
      const fixedChanged =
        normalizeDecimalInput(item.fixed_fee) !==
        normalizeDecimalInput(originalItem?.fixed_fee ?? "0");

      if (percentChanged || fixedChanged) {
        const row = TARIFF_GRID_ROWS.find(
          (candidate) => candidate.kind === "tariff" && candidate.operation === item.operation,
        );
        items.push({
          key: `tariff:${item.operation}`,
          label: row?.label || item.operation,
        });
      }
    });

    if (
      normalizeDecimalInput(settings.usdt_withdraw_fee_fixed) !==
      normalizeDecimalInput(originalSettings.usdt_withdraw_fee_fixed)
    ) {
      items.push({
        key: "external:usdt_withdraw_fee_fixed",
        label: "Перевод USDT TRC20 внешним пользователям",
      });
    }

    return items;
  }, [currentTariffs, originalCurrentTariffs, originalSettings, settings]);

  useEffect(() => {
    if (!loading && changedReasonItems.length > 0 && !noticeShownRef.current) {
      setShowReasonNotice(true);
      noticeShownRef.current = true;
    }
    if (changedReasonItems.length === 0) {
      noticeShownRef.current = false;
    }
  }, [changedReasonItems.length, loading]);

  function updateSetting<K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) {
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

  function openReasonModal() {
    setPendingReasonItems(changedReasonItems);
    setPendingReasonInputs(
      Object.fromEntries(
        changedReasonItems.map((item) => [item.key, ""]),
      ) as ReasonMap,
    );
    setShowReasonModal(true);
  }

  async function persistRates(reasonOverrides?: ReasonMap) {
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const nextReasons = {
        ...reasons,
        ...(reasonOverrides || {}),
      };

      const settingsPayload: Partial<AdminSettings> = {
        esom_per_usd: normalizeDecimalInput(settings.esom_per_usd),
        usdt_withdraw_fee_fixed: normalizeDecimalInput(
          settings.usdt_withdraw_fee_fixed,
        ),
        min_withdraw_usdt_trc20: normalizeDecimalInput(
          settings.min_withdraw_usdt_trc20,
        ),
        rates_change_reasons_json: JSON.stringify(nextReasons),
      };

      const tariffsPayload = currentTariffs.map((item) => ({
        category: item.category,
        residency: item.residency,
        operation: item.operation,
        percent_fee: normalizeDecimalInput(item.percent_fee),
        fixed_fee: normalizeDecimalInput(item.fixed_fee),
      }));

      const [savedSettings, savedTariffs] = await Promise.all([
        putAdminSettings(settingsPayload),
        putTariffs(tariffsPayload),
      ]);

      setSettings((prev) => ({ ...prev, ...savedSettings }));
      setOriginalSettings((prev) => ({ ...prev, ...savedSettings }));
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
      setOriginalTariffs((prev) => {
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
      setReasons(nextReasons);
      setPendingReasonItems([]);
      setPendingReasonInputs({});
      setShowReasonModal(false);
      setSuccess("Тарифная сетка сохранена");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Не удалось сохранить тарифную сетку"));
    } finally {
      setSaving(false);
    }
  }

  async function saveRates() {
    if (changedReasonItems.length > 0) {
      openReasonModal();
      return;
    }
    await persistRates();
  }

  async function confirmReasonsAndSave() {
    const missingItem = pendingReasonItems.find(
      (item) => !pendingReasonInputs[item.key]?.trim(),
    );
    if (missingItem) {
      setError(`Укажите причину для поля: ${missingItem.label}`);
      return;
    }

    const reasonOverrides = Object.fromEntries(
      pendingReasonItems.map((item) => [item.key, pendingReasonInputs[item.key].trim()]),
    ) as ReasonMap;

    await persistRates(reasonOverrides);
  }

  if (loading) {
    return <div className="m-auto text-muted">Загрузка...</div>;
  }

  return (
    <>
      <div className="flex-1 min-h-0 overflow-auto pb-8">
        <div className="w-full max-w-[1500px] px-4">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-soft bg-card/80 px-4 py-2 text-sm text-muted">
              Настройка тарифов, комиссий и причин их изменения для текущей витрины
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

          <Card
            title="Тарифная сетка клиентов"
            subtitle="Минимум вывода для внешних переводов USDT TRC20 настраивается прямо в общей сетке, а для курса и комиссий теперь обязательно указывается причина изменений."
          >
            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="grid gap-1">
                <span className="text-xs text-muted">Категория</span>
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
                <span className="text-xs text-muted">Резидентство</span>
                <select
                  className="ui-input"
                  value={residency}
                  onChange={(e) => setResidency(e.target.value as CustomerResidency)}
                >
                  <option value="RESIDENT">Резидент</option>
                  <option value="NON_RESIDENT">Нерезидент</option>
                </select>
              </label>
              <label className="grid gap-1">
                <span className="flex items-center gap-2 text-xs text-muted">
                  <InfoHint
                    text={
                      reasons["rate:esom_per_usd"] ||
                      "Причина изменения курса пока не указана."
                    }
                  />
                  <span>Курс USD к СОМ</span>
                </span>
                <input
                  className="ui-input"
                  value={settings.esom_per_usd}
                  onChange={(e) => updateSetting("esom_per_usd", e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                />
              </label>
            </div>

            <div className="mb-3 hidden xl:grid xl:grid-cols-[1.8fr_0.7fr_0.9fr_1fr] xl:gap-3 xl:px-1">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Операция
              </div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Процент
              </div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Комиссия
              </div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Минимум вывода
              </div>
            </div>

            <div className="space-y-3">
              {TARIFF_GRID_ROWS.map((row) => {
                if (row.kind === "external_usdt") {
                  return (
                    <TariffGridRowCard
                      key={row.label}
                      label={row.label}
                      percent="Не используется"
                      fixed={settings.usdt_withdraw_fee_fixed}
                      minimum={settings.min_withdraw_usdt_trc20}
                      reason={
                        reasons["external:usdt_withdraw_fee_fixed"] ||
                        "Причина изменения комиссии пока не указана."
                      }
                      onFixedChange={(value) =>
                        updateSetting("usdt_withdraw_fee_fixed", value)
                      }
                      onMinimumChange={(value) =>
                        updateSetting("min_withdraw_usdt_trc20", value)
                      }
                      percentDisabled
                    />
                  );
                }

                const item = currentTariffs.find(
                  (tariff) => tariff.operation === row.operation,
                );

                return (
                  <TariffGridRowCard
                    key={row.operation}
                    label={row.label}
                    percent={item?.percent_fee ?? "0"}
                    fixed={item?.fixed_fee ?? "0"}
                    minimum="—"
                    reason={
                      reasons[`tariff:${row.operation}`] ||
                      "Причина изменения комиссии пока не указана."
                    }
                    onPercentChange={(value) =>
                      updateTariff(row.operation, { percent_fee: value })
                    }
                    onFixedChange={(value) =>
                      updateTariff(row.operation, { fixed_fee: value })
                    }
                    minimumDisabled
                  />
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <button
                className="btn btn-primary h-10 px-4"
                onClick={saveRates}
                disabled={saving}
              >
                {saving ? "Сохранение..." : "Сохранить тарифы"}
              </button>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={showReasonNotice}
        onClose={() => setShowReasonNotice(false)}
        title="Нужна причина изменения"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Вы изменили курс или комиссию. Перед сохранением нужно будет указать
            короткую причину изменения.
          </p>
          <div className="flex justify-end">
            <button
              className="btn btn-primary h-10 px-4"
              onClick={() => setShowReasonNotice(false)}
            >
              Понятно
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showReasonModal}
        onClose={() => setShowReasonModal(false)}
        title="Укажите причины изменений"
      >
        <div className="space-y-4">
          <div className="text-sm text-muted">
            Для каждого измененного курса или комиссии укажите короткую причину,
            например номер приказа или пояснение по изменению.
          </div>

          {pendingReasonItems.map((item) => (
            <label key={item.key} className="grid gap-1">
              <span className="text-sm font-medium">{item.label}</span>
              <textarea
                className="ui-input min-h-24 resize-y"
                value={pendingReasonInputs[item.key] ?? ""}
                onChange={(e) =>
                  setPendingReasonInputs((prev) => ({
                    ...prev,
                    [item.key]: e.target.value,
                  }))
                }
                placeholder="Например: приказ №12 от 09.07.2026"
              />
            </label>
          ))}

          <div className="flex justify-end gap-3">
            <button className="btn h-10 px-4" onClick={() => setShowReasonModal(false)}>
              Отмена
            </button>
            <button
              className="btn btn-primary h-10 px-4"
              onClick={confirmReasonsAndSave}
              disabled={saving}
            >
              {saving ? "Сохранение..." : "Сохранить с причинами"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
