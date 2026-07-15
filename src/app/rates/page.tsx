"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import {
  getAdminActionLogs,
  getAdminSettings,
  getAdmins,
  getTariffs,
  putAdminSettings,
  putTariffs,
  type AdminActionLog,
  TariffOperation,
  TariffSetting,
} from "@/lib/api";
import { exportRows } from "@/lib/exporters";
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
    }
  | {
      kind: "external_usdt_min";
      label: string;
    };

type ReasonMap = Record<string, string>;

type PendingReasonItem = {
  key: string;
  label: string;
};

type RateHistoryRow = {
  createdAt: string;
  adminId: number;
  comment: string;
  changes: string;
};

type AdminOption = {
  id: string;
  label: string;
  login: string;
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
  {
    kind: "external_usdt_min",
    label: "Минимум вывода USDT TRC20",
  },
];

const RATE_ROW_HINTS: Record<string, string> = {
  SOM_TO_ESOM: "Здесь назначается комиссия за конвертацию SOM в SALAM.",
  ESOM_TO_SOM: "Здесь назначается комиссия за конвертацию SALAM в SOM.",
  WALLET_TRANSFER_ESOM:
    "Здесь назначается комиссия за внутренний перевод банка между пользователями в валюте SALAM.",
  ESOM_TO_USDT_TRC20:
    "Здесь назначается комиссия за конвертацию SALAM в USDT TRC20.",
  USDT_TRC20_TO_ESOM:
    "Здесь назначается комиссия за конвертацию USDT TRC20 в SALAM.",
  WALLET_TRANSFER_USDT_TRC20:
    "Здесь назначается комиссия за внутренний перевод банка между пользователями в USDT TRC20.",
  external_usdt:
    "Здесь назначается комиссия за вывод USDT TRC20 внешнему пользователю.",
  external_usdt_min:
    "Здесь указывается минимальная сумма вывода USDT TRC20.",
};

const RATE_HISTORY_LABELS: Record<string, string> = {
  "rate:usd_buy_rate": "Курс покупки USD",
  "rate:usd_sell_rate": "Курс продажи USD",
  "external:usdt_trade_fee_pct": "Комиссия внешнего перевода USDT TRC20",
  "external:usdt_withdraw_fee_fixed": "Фикс. сумма комиссии внешнего вывода USDT TRC20",
  "external:min_withdraw_usdt_trc20": "Минимум вывода USDT TRC20",
};

function rateHistoryLabelForKey(key: string): string {
  if (RATE_HISTORY_LABELS[key]) return RATE_HISTORY_LABELS[key];
  if (key.startsWith("tariff:")) {
    const operation = key.slice("tariff:".length) as TariffOperation;
    return (
      TARIFF_GRID_ROWS.find(
        (row) => row.kind === "tariff" && row.operation === operation,
      )?.label || key
    );
  }
  return key;
}

const EMPTY_SETTINGS: AdminSettings = {
  esom_per_usd: "0",
  usd_buy_rate: "0",
  usd_sell_rate: "0",
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

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
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

function parseActionDetails(details: unknown): Record<string, any> | null {
  if (!details) return null;
  if (typeof details === "object") return details as Record<string, any>;
  if (typeof details !== "string") return null;
  try {
    const parsed = JSON.parse(details);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

const RATE_HISTORY_KEYS = [
  "usdt_trade_fee_pct",
  "usdt_withdraw_fee_fixed",
  "min_withdraw_usdt_trc20",
] as const;

function normalizeHistoryValue(value: unknown): string {
  return normalizeDecimalInput(String(value ?? ""));
}

function historyLabelForRates(key: string): string {
  const labels: Record<string, string> = {
    "rate:usd_buy_rate": "\u041a\u0443\u0440\u0441 \u043f\u043e\u043a\u0443\u043f\u043a\u0438 USD",
    "rate:usd_sell_rate": "\u041a\u0443\u0440\u0441 \u043f\u0440\u043e\u0434\u0430\u0436\u0438 USD",
    "external:usdt_trade_fee_pct": "\u041a\u043e\u043c\u0438\u0441\u0441\u0438\u044f USDT",
    "external:usdt_withdraw_fee_fixed": "\u0424\u0438\u043a\u0441. \u0441\u0443\u043c\u043c\u0430 USDT",
    "external:min_withdraw_usdt_trc20": "\u041c\u0438\u043d. \u0432\u044b\u0432\u043e\u0434 USDT",
  };
  if (labels[key]) return labels[key];
  if (key.startsWith("tariff:")) {
    const operation = key.slice("tariff:".length) as TariffOperation;
    const map: Record<string, string> = {
      SOM_TO_ESOM: "\u0421\u041e\u041c \u0432 SALAM",
      ESOM_TO_SOM: "SALAM \u0432 \u0421\u041e\u041c",
      WALLET_TRANSFER_ESOM: "\u0412\u043d\u0443\u0442\u0440. SALAM",
      ESOM_TO_USDT_TRC20: "SALAM \u0432 USDT",
      USDT_TRC20_TO_ESOM: "USDT \u0432 SALAM",
      WALLET_TRANSFER_USDT_TRC20: "\u0412\u043d\u0443\u0442\u0440. USDT",
    };
    return map[operation] || rateHistoryLabelForKey(key);
  }
  return rateHistoryLabelForKey(key);
}

function extractRateHistory(logs: AdminActionLog[]): RateHistoryRow[] {
  const ordered = [...logs].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const grouped = new Map<string, AdminActionLog[]>();
  for (const log of ordered) {
    const action = String(log.action || "unknown");
    const list = grouped.get(action);
    if (list) list.push(log);
    else grouped.set(action, [log]);
  }

  const rows: RateHistoryRow[] = [];

  for (const actionLogs of grouped.values()) {
    let previousBody: Record<string, any> | null = null;

    for (const log of actionLogs) {
      const details = parseActionDetails(log.details);
      const rawBody = details?.body ?? details?.data ?? details;
      const body =
        rawBody && typeof rawBody === "object" && !Array.isArray(rawBody)
          ? (rawBody as Record<string, any>)
          : {};
      const tariffItems = Array.isArray(rawBody)
        ? rawBody
        : Array.isArray(body.items)
          ? body.items
          : [];
      const prevTariffItems = Array.isArray(previousBody?.items)
        ? (previousBody?.items as Record<string, any>[])
        : [];
      const reasons = parseReasons(
        typeof body.rates_change_reasons_json === "string"
          ? body.rates_change_reasons_json
          : "",
      );

      const changes: string[] = [];
      const commentParts: string[] = [];

      for (const key of RATE_HISTORY_KEYS) {
        const current = normalizeHistoryValue(body[key]);
        const previous = normalizeHistoryValue(previousBody?.[key]);
        if (!String(current).trim() && !String(previous).trim()) continue;
        if (current === previous) continue;
        const label = historyLabelForRates(`rate:${key}`);
        const changeText = !previous
          ? `${label}: ${current}`
          : `${label}: ${previous} \u2192 ${current}`;
        changes.push(changeText.replace(/\s+/g, " ").trim());

        const reason = String(reasons[`rate:${key}`] ?? "").trim();
        if (reason) commentParts.push(`${label}: ${reason}`);
      }

      for (const item of tariffItems) {
        if (!item || typeof item !== "object") continue;
        const operation = String((item as Record<string, any>).operation ?? "");
        if (!operation) continue;
        const previousItem = prevTariffItems.find(
          (candidate) => String(candidate?.operation ?? "") === operation,
        );
        const percent = normalizeHistoryValue((item as Record<string, any>).percent_fee);
        const fixed = normalizeHistoryValue((item as Record<string, any>).fixed_fee);
        const prevPercent = normalizeHistoryValue(previousItem?.percent_fee);
        const prevFixed = normalizeHistoryValue(previousItem?.fixed_fee);

        if (percent === prevPercent && fixed === prevFixed) continue;

        const label = historyLabelForRates(`tariff:${operation}`);
        const parts: string[] = [];
        if (percent !== prevPercent) {
          parts.push(
            prevPercent ? `\u041f\u0440\u043e\u0446\u0435\u043d\u0442 ${prevPercent} \u2192 ${percent}` : `\u041f\u0440\u043e\u0446\u0435\u043d\u0442 ${percent}`,
          );
        }
        if (fixed !== prevFixed) {
          parts.push(
            prevFixed ? `\u0424\u0438\u043a\u0441. \u0441\u0443\u043c\u043c\u0430 ${prevFixed} \u2192 ${fixed}` : `\u0424\u0438\u043a\u0441. \u0441\u0443\u043c\u043c\u0430 ${fixed}`,
          );
        }
        if (parts.length) {
          changes.push(`${label}: ${parts.join(", ")}`.replace(/\s+/g, " ").trim());
          const reason = String(reasons[`tariff:${operation}`] ?? "").trim();
          if (reason) commentParts.push(`${label}: ${reason}`);
        }
      }

      previousBody = body;
      if (!changes.length) continue;

      rows.push({
        createdAt: log.createdAt,
        adminId: log.admin_id,
        comment: commentParts.length ? commentParts.join("\n") : "-",
        changes: changes.join("\n"),
      });
    }
  }

  return rows.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
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

function TitleHint({ label, hint }: { label: string; hint?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{label}</span>
      {hint ? <InfoHint text={hint} /> : null}
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
  comment,
  onCommentChange,
  commentLabel = "Комментарий",
  commentPlaceholder = "Почему меняется значение",
  suffix,
  placeholder = "0",
  disabled = false,
  muted = false,
  showComment = true,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  comment?: string;
  onCommentChange?: (value: string) => void;
  commentLabel?: string;
  commentPlaceholder?: string;
  suffix?: string;
  placeholder?: string;
  disabled?: boolean;
  muted?: boolean;
  showComment?: boolean;
}) {
  if (disabled) {
    return (
      <div className="grid gap-1">
        <span className="text-xs text-muted">{label}</span>
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
      <span className="text-xs text-muted">{label}</span>
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
      {showComment ? (
        <div className="grid gap-1 pt-1">
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted">
            {commentLabel}
          </span>
          <textarea
            className="ui-input min-h-[72px] resize-y"
            value={comment || ""}
            onChange={(e) => onCommentChange?.(e.target.value)}
            placeholder={commentPlaceholder}
          />
        </div>
      ) : null}
    </label>
  );
}

function TariffGridRowCard({
  label,
  hint,
  percent,
  fixed,
  comment,
  onPercentChange,
  onFixedChange,
  onCommentChange,
  percentDisabled = false,
  fixedDisabled = false,
  percentLabel = "Процент",
  fixedLabel = "Фикс сумма комиссии",
  showPercent = true,
  showFixed = true,
}: {
  label: string;
  hint?: string;
  percent: string;
  fixed: string;
  comment?: string;
  onPercentChange?: (value: string) => void;
  onFixedChange: (value: string) => void;
  onCommentChange?: (value: string) => void;
  percentDisabled?: boolean;
  fixedDisabled?: boolean;
  percentLabel?: string;
  fixedLabel?: string;
  showPercent?: boolean;
  showFixed?: boolean;
}) {
  const gridClassName = showFixed
    ? "xl:grid-cols-[1.8fr_0.7fr_0.9fr]"
    : "xl:grid-cols-[1.8fr_1fr]";
  const commentSpanClass = showFixed ? "xl:col-span-3" : "xl:col-span-2";

  return (
    <div
      className={`grid grid-cols-1 gap-3 rounded-xl border border-soft bg-[var(--bg-soft)] p-4 ${gridClassName} xl:items-center`}
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold">
          <TitleHint label={label} hint={hint} />
        </div>
      </div>
      <GridValue
        label={percentLabel}
        value={percent}
        onChange={onPercentChange}
        disabled={percentDisabled || !showPercent}
        muted={percentDisabled || !showPercent}
        showComment={false}
      />
      {showFixed ? (
        <GridValue
          label={fixedLabel}
          value={fixed}
          onChange={onFixedChange}
          disabled={fixedDisabled}
          muted={fixedDisabled}
          showComment={false}
        />
      ) : null}
      <div className={`grid gap-1 ${commentSpanClass}`}>
        <span className="text-[11px] uppercase tracking-[0.12em] text-muted">
          Комментарий к изменению
        </span>
        <textarea
          className="ui-input min-h-[72px] resize-y"
          value={comment || ""}
          onChange={(e) => onCommentChange?.(e.target.value)}
          placeholder="Почему меняется тариф"
        />
      </div>
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
  const [reasonDrafts, setReasonDrafts] = useState<ReasonMap>({});
  const [rateHistoryRows, setRateHistoryRows] = useState<RateHistoryRow[]>([]);
  const [currencyHistoryLoading, setCurrencyHistoryLoading] = useState(false);
  const [admins, setAdmins] = useState<AdminOption[]>([]);

  function normalizeLoadedSettings(input: AdminSettings): AdminSettings {
    const buyRate =
      input.usd_buy_rate?.trim() || input.esom_per_usd?.trim() || "0";
    const sellRate =
      input.usd_sell_rate?.trim() || input.esom_per_usd?.trim() || buyRate;
    return {
      ...input,
      usd_buy_rate: buyRate,
      usd_sell_rate: sellRate,
      esom_per_usd: input.esom_per_usd?.trim() || buyRate,
    };
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [settingsData, tariffsData] = await Promise.all([
          getAdminSettings(),
          getTariffs(),
        ]);
        if (!alive) return;
        const normalizedSettings = normalizeLoadedSettings(settingsData);
        setSettings(normalizedSettings);
        setOriginalSettings(normalizedSettings);
        setTariffs(tariffsData);
        setOriginalTariffs(tariffsData);
        const loadedReasons = parseReasons(
          normalizedSettings.rates_change_reasons_json || "",
        );
        setReasons(loadedReasons);
        setReasonDrafts(loadedReasons);
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

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getAdmins({ limit: 500, offset: 0, sortLastName: "asc", sortFirstName: "asc" });
        if (!alive) return;
        setAdmins(
          res.items.map((admin) => ({
            id: admin.id,
            label: [admin.lastName, admin.firstName].filter(Boolean).join(" ") || admin.login || `#${admin.id}`,
            login: admin.login,
          })),
        );
      } catch {
        if (!alive) return;
        setAdmins([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setCurrencyHistoryLoading(true);
      try {
        const [adminLogs, tariffLogs] = await Promise.all([
          getAdminActionLogs({
            actionQuery: "PUT /blockchain-config/admin-settings",
            limit: 200,
            sortBy: "createdAt",
            sortDir: "desc",
          }),
          getAdminActionLogs({
            actionQuery: "PUT /blockchain-config/tariffs",
            limit: 200,
            sortBy: "createdAt",
            sortDir: "desc",
          }),
        ]);
        if (!alive) return;
        setRateHistoryRows(
          extractRateHistory([...adminLogs.items, ...tariffLogs.items]),
        );
      } catch {
        if (!alive) return;
        setRateHistoryRows([]);
      } finally {
        if (alive) setCurrencyHistoryLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const adminLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const admin of admins) map.set(admin.id, admin.label);
    return map;
  }, [admins]);

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
      normalizeDecimalInput(settings.usd_buy_rate) !==
      normalizeDecimalInput(originalSettings.usd_buy_rate)
    ) {
      items.push({ key: "rate:usd_buy_rate", label: "Курс покупки USD" });
    }

    if (
      normalizeDecimalInput(settings.usd_sell_rate) !==
      normalizeDecimalInput(originalSettings.usd_sell_rate)
    ) {
      items.push({ key: "rate:usd_sell_rate", label: "Курс продажи USD" });
    }

    if (
      normalizeDecimalInput(settings.usdt_trade_fee_pct) !==
        normalizeDecimalInput(originalSettings.usdt_trade_fee_pct) ||
      normalizeDecimalInput(settings.usdt_withdraw_fee_fixed) !==
        normalizeDecimalInput(originalSettings.usdt_withdraw_fee_fixed)
    ) {
      items.push({
        key: "external:usdt_trade_fee_pct",
        label: "Перевод USDT TRC20 внешним пользователям",
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
          (candidate) =>
            candidate.kind === "tariff" && candidate.operation === item.operation,
        );
        items.push({
          key: `tariff:${item.operation}`,
          label: row?.label || item.operation,
        });
      }
    });

    if (
      normalizeDecimalInput(settings.min_withdraw_usdt_trc20) !==
      normalizeDecimalInput(originalSettings.min_withdraw_usdt_trc20)
    ) {
      items.push({
        key: "external:min_withdraw_usdt_trc20",
        label: "Минимум вывода USDT TRC20",
      });
    }

    return items;
  }, [currentTariffs, originalCurrentTariffs, originalSettings, settings]);

  const tariffChanged = useMemo(
    () => changedReasonItems.some((item) => item.key.startsWith("tariff:")),
    [changedReasonItems],
  );

  const rateCommentKeys = useMemo(() => {
    const keys: string[] = [];
    if (normalizeDecimalInput(settings.usd_buy_rate) !== normalizeDecimalInput(originalSettings.usd_buy_rate)) {
      keys.push("rate:usd_buy_rate");
    }
    if (normalizeDecimalInput(settings.usd_sell_rate) !== normalizeDecimalInput(originalSettings.usd_sell_rate)) {
      keys.push("rate:usd_sell_rate");
    }
    if (
      normalizeDecimalInput(settings.usdt_trade_fee_pct) !==
        normalizeDecimalInput(originalSettings.usdt_trade_fee_pct) ||
      normalizeDecimalInput(settings.usdt_withdraw_fee_fixed) !==
        normalizeDecimalInput(originalSettings.usdt_withdraw_fee_fixed)
    ) {
      keys.push("external:usdt_trade_fee_pct");
    }
    if (normalizeDecimalInput(settings.min_withdraw_usdt_trc20) !== normalizeDecimalInput(originalSettings.min_withdraw_usdt_trc20)) {
      keys.push("external:min_withdraw_usdt_trc20");
    }
    currentTariffs.forEach((item) => {
      const originalItem = originalCurrentTariffs.find((candidate) => candidate.operation === item.operation);
      const percentChanged =
        normalizeDecimalInput(item.percent_fee) !== normalizeDecimalInput(originalItem?.percent_fee ?? "0");
      const fixedChanged =
        normalizeDecimalInput(item.fixed_fee) !== normalizeDecimalInput(originalItem?.fixed_fee ?? "0");
      if (percentChanged || fixedChanged) keys.push(`tariff:${item.operation}`);
    });
    return keys;
  }, [currentTariffs, originalCurrentTariffs, originalSettings, settings]);

  const currencyRateChanged = useMemo(() => {
    return (
      normalizeDecimalInput(settings.usd_buy_rate) !==
        normalizeDecimalInput(originalSettings.usd_buy_rate) ||
      normalizeDecimalInput(settings.usd_sell_rate) !==
        normalizeDecimalInput(originalSettings.usd_sell_rate)
    );
  }, [
    originalSettings.usd_buy_rate,
    originalSettings.usd_sell_rate,
    settings.usd_buy_rate,
    settings.usd_sell_rate,
  ]);

  const syncReasonDraft = useMemo(
    () => (key: string) => reasonDrafts[key] ?? reasons[key] ?? "",
    [reasonDrafts, reasons],
  );

  function getRateReason(key: string) {
    return syncReasonDraft(key);
  }

  function clearReasonDraft(key: string) {
    setReasonDrafts((prev) => ({ ...prev, [key]: "" }));
  }

  function updateSetting<K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    if (
      key === "usd_buy_rate" &&
      normalizeDecimalInput(String(value)) !==
        normalizeDecimalInput(originalSettings.usd_buy_rate)
    ) {
      clearReasonDraft("rate:usd_buy_rate");
    }
    if (
      key === "usd_sell_rate" &&
      normalizeDecimalInput(String(value)) !==
        normalizeDecimalInput(originalSettings.usd_sell_rate)
    ) {
      clearReasonDraft("rate:usd_sell_rate");
    }
    if (
      key === "usdt_trade_fee_pct" &&
      normalizeDecimalInput(String(value)) !==
        normalizeDecimalInput(originalSettings.usdt_trade_fee_pct)
    ) {
      clearReasonDraft("external:usdt_trade_fee_pct");
    }
    if (
      key === "usdt_withdraw_fee_fixed" &&
      normalizeDecimalInput(String(value)) !==
        normalizeDecimalInput(originalSettings.usdt_withdraw_fee_fixed)
    ) {
      clearReasonDraft("external:usdt_trade_fee_pct");
    }
    if (
      key === "min_withdraw_usdt_trc20" &&
      normalizeDecimalInput(String(value)) !==
        normalizeDecimalInput(originalSettings.min_withdraw_usdt_trc20)
    ) {
      clearReasonDraft("external:min_withdraw_usdt_trc20");
    }
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
    clearReasonDraft(`tariff:${operation}`);
  }

  function updateReasonDraft(key: string, value: string) {
    setReasonDrafts((prev) => ({ ...prev, [key]: value }));
  }

  async function persistRates() {
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const nextReasons = {
        ...reasons,
        ...reasonDrafts,
      };

      const settingsPayload: Partial<AdminSettings> = {
        esom_per_usd: normalizeDecimalInput(settings.usd_buy_rate),
        usd_buy_rate: normalizeDecimalInput(settings.usd_buy_rate),
        usd_sell_rate: normalizeDecimalInput(settings.usd_sell_rate),
        usdt_trade_fee_pct: normalizeDecimalInput(settings.usdt_trade_fee_pct),
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

      const savedSettings = await putAdminSettings(settingsPayload);
      const savedTariffs = tariffChanged ? await putTariffs(tariffsPayload) : null;

      setSettings((prev) => ({ ...prev, ...savedSettings }));
      setOriginalSettings((prev) => ({ ...prev, ...savedSettings }));
      if (savedTariffs) {
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
      }
      setReasons(nextReasons);
      setReasonDrafts(nextReasons);
      setSuccess("Тарифная сетка сохранена");
      const [adminLogs, tariffLogs] = await Promise.all([
        getAdminActionLogs({
          actionQuery: "PUT /blockchain-config/admin-settings",
          limit: 200,
          sortBy: "createdAt",
          sortDir: "desc",
        }),
        getAdminActionLogs({
          actionQuery: "PUT /blockchain-config/tariffs",
          limit: 200,
          sortBy: "createdAt",
          sortDir: "desc",
        }),
      ]);
      setRateHistoryRows(
        extractRateHistory([...adminLogs.items, ...tariffLogs.items]),
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Не удалось сохранить тарифную сетку"));
    } finally {
      setSaving(false);
    }
  }

  async function saveCurrencyRates() {
    if (!currencyRateChanged) {
      setSuccess("Курсы валют уже актуальны");
      return;
    }
    const missing = rateCommentKeys.find((key) => !getRateReason(key).trim());
    if (missing) {
      setError(`Укажите комментарий для поля: ${RATE_HISTORY_LABELS[missing] || missing}`);
      return;
    }
    await persistRates();
  }

  async function exportCurrencyHistoryCsv() {
    await exportRows({
      format: "csv",
      fileBaseName: "rates_comments_history",
      title: "История комментариев и изменений тарифов",
      columns: [
        {
          header: "Дата",
          getValue: (row: RateHistoryRow) => formatDateTime(row.createdAt),
        },
        {
          header: "Админ ID",
          getValue: (row: RateHistoryRow) => adminLookup.get(String(row.adminId)) || (row.adminId === 0 ? "\u041b\u043e\u043a\u0430\u043b\u044c\u043d\u043e" : `#${row.adminId}`),
        },
        {
          header: "Изменения",
          getValue: (row: RateHistoryRow) => row.changes,
        },
        {
          header: "Комментарий",
          getValue: (row: RateHistoryRow) => row.comment,
        },
      ],
      rows: rateHistoryRows,
    });
  }

  async function saveRates() {
    if (!changedReasonItems.length) {
      setSuccess("Изменений нет");
      setError(null);
      return;
    }
    const missingItem = changedReasonItems.find(
      (item) => !getRateReason(item.key).trim(),
    );
    if (missingItem) {
      setError(`Укажите комментарий для поля: ${missingItem.label}`);
      return;
    }
    await persistRates();
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
            subtitle="Для тарифов теперь обязательно указывается причина изменений, а минимум вывода USDT TRC20 вынесен отдельной строкой под внешними переводами."
          >
            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
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
            </div>

            <div className="mb-3 hidden xl:grid xl:grid-cols-[1.8fr_0.7fr_0.9fr] xl:gap-3 xl:px-1">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Операция
              </div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Процент
              </div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Фикс сумма комиссии
              </div>
            </div>

            <div className="space-y-3">
              {TARIFF_GRID_ROWS.map((row) => {
                if (row.kind === "external_usdt") {
                  return (
                    <TariffGridRowCard
                      key={row.label}
                      label={row.label}
                      hint={RATE_ROW_HINTS.external_usdt}
                      percent={settings.usdt_trade_fee_pct}
                      fixed={settings.usdt_withdraw_fee_fixed}
                      comment={getRateReason("external:usdt_trade_fee_pct")}
                      onPercentChange={(value) =>
                        updateSetting("usdt_trade_fee_pct", value)
                      }
                      onFixedChange={(value) =>
                        updateSetting("usdt_withdraw_fee_fixed", value)
                      }
                      onCommentChange={(value) =>
                        updateReasonDraft("external:usdt_trade_fee_pct", value)
                      }
                    />
                  );
                }

                if (row.kind === "external_usdt_min") {
                  return (
                    <TariffGridRowCard
                      key={row.label}
                      label={row.label}
                      hint={RATE_ROW_HINTS.external_usdt_min}
                      percent={settings.min_withdraw_usdt_trc20}
                      fixed="—"
                      percentLabel="Минимум вывода"
                      comment={getRateReason("external:min_withdraw_usdt_trc20")}
                      onPercentChange={(value) =>
                        updateSetting("min_withdraw_usdt_trc20", value)
                      }
                      onCommentChange={(value) =>
                        updateReasonDraft("external:min_withdraw_usdt_trc20", value)
                      }
                      showPercent
                      showFixed={false}
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
                    hint={RATE_ROW_HINTS[row.operation]}
                    percent={item?.percent_fee ?? "0"}
                    fixed={item?.fixed_fee ?? "0"}
                    comment={getRateReason(`tariff:${row.operation}`)}
                    onPercentChange={(value) =>
                      updateTariff(row.operation, { percent_fee: value })
                    }
                    onFixedChange={(value) =>
                      updateTariff(row.operation, { fixed_fee: value })
                    }
                    onCommentChange={(value) =>
                      updateReasonDraft(`tariff:${row.operation}`, value)
                    }
                  />
                );
              })}
            </div>

            <div className="mt-8 rounded-2xl border border-soft bg-[var(--bg-soft)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">История комментариев</div>
                  <div className="mt-1 text-sm text-muted">
                    Дата, админ, какие поля менялись и какой комментарий был указан.
                  </div>
                </div>
                <button
                  className="btn h-9 px-3"
                  type="button"
                  onClick={exportCurrencyHistoryCsv}
                  disabled={!rateHistoryRows.length}
                >
                  CSV
                </button>
              </div>
              <div className="mt-4 max-h-[320px] overflow-auto rounded-2xl border border-soft bg-white/70">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-xs uppercase tracking-wide text-muted">
                      <th className="px-4 py-3">Дата</th>
                      <th className="px-4 py-3">Админ</th>
                      <th className="px-4 py-3">Изменения</th>
                      <th className="px-4 py-3">Комментарий</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currencyHistoryLoading ? (
                      <tr>
                        <td className="px-4 py-6 text-muted" colSpan={4}>
                          Загрузка истории...
                        </td>
                      </tr>
                    ) : rateHistoryRows.length ? (
                      rateHistoryRows.map((row) => (
                        <tr key={`${row.createdAt}-${row.adminId}`} className="border-t border-soft">
                          <td className="px-4 py-3 whitespace-nowrap">
                            {formatDateTime(row.createdAt)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">{adminLookup.get(String(row.adminId)) || (row.adminId === 0 ? "\u041b\u043e\u043a\u0430\u043b\u044c\u043d\u043e" : `#${row.adminId}`)}</td>
                          <td className="px-4 py-3">
                            <div className="max-w-[28rem] whitespace-pre-line break-words text-muted">
                              {row.changes}
                            </div>
                          </td>
                          <td className="px-4 py-3 max-w-[18rem] whitespace-pre-line break-words text-muted">
                            {row.comment || "—"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-4 py-6 text-muted" colSpan={4}>
                          История пока пустая.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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

    </>
  );
}
