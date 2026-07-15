"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getAdminSettings,
  getAdminActionLogs,
  putAdminSettings,
  type AdminActionLog,
} from "@/lib/api";
import { exportRows } from "@/lib/exporters";
import { AdminSettings } from "@/types";

type ReasonMap = Record<string, string>;

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

function normalizeDecimalInput(value: unknown) {
  const trimmed = String(value ?? "").trim();
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

function toCleanString(value: unknown): string {
  return String(value ?? "").trim();
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

const CURRENCY_HISTORY_KEYS = ["usd_buy_rate", "usd_sell_rate"] as const;

function normalizeHistoryValue(value: unknown): string {
  return normalizeDecimalInput(String(value ?? ""));
}

function currencyHistoryLabel(key: string): string {
  return key === "usd_buy_rate"
    ? "Курс покупки USD"
    : "Курс продажи USD";
}

function extractCurrencyHistory(logs: AdminActionLog[]): RateHistoryRow[] {
  const ordered = [...logs].filter(Boolean).sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  let previousBody: Record<string, any> | null = null;

  return ordered
    .map((log) => {
      const details = parseActionDetails(log.details);
      const body = (details?.body && typeof details.body === "object"
        ? details.body
        : {}) as Record<string, any>;

      const reasons = parseReasons(
        typeof body.rates_change_reasons_json === "string"
          ? body.rates_change_reasons_json
          : "",
      );

      const changes: string[] = [];
      const commentParts: string[] = [];

      for (const key of CURRENCY_HISTORY_KEYS) {
        const current = normalizeHistoryValue(body[key]);
        const previous = normalizeHistoryValue(previousBody?.[key]);
        if (!String(current).trim() && !String(previous).trim()) continue;
        if (current === previous) continue;

        const label = currencyHistoryLabel(key);
        changes.push(
          !previous
            ? `${label}: ${current}`
            : `${label}: ${previous} \u2192 ${current}`,
        );

        const reason = String(reasons[`rate:${key}`] ?? "").trim();
        if (reason) commentParts.push(`${label}: ${reason}`);
      }

      previousBody = body;
      if (!changes.length) return null;

      return {
        createdAt: log.createdAt,
        adminId: log.admin_id,
        comment: commentParts.length ? commentParts.join("\n") : "-",
        changes: changes.join("\n"),
      };
    })
    .filter((row): row is RateHistoryRow => Boolean(row))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

function GridValue({
  label,
  value,
  onChange,
  comment,
  onCommentChange,
  commentPlaceholder = "Почему меняется значение",
  placeholder = "0",
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  comment?: string;
  onCommentChange?: (value: string) => void;
  commentPlaceholder?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs text-muted">{label}</span>
      <input
        className="ui-input"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        inputMode="decimal"
        placeholder={placeholder}
      />
      <div className="grid gap-1 pt-1">
        <span className="text-[11px] uppercase tracking-[0.12em] text-muted">
          Комментарий
        </span>
        <textarea
          className="ui-input min-h-[72px] resize-y"
          value={comment || ""}
          onChange={(e) => onCommentChange?.(e.target.value)}
          placeholder={commentPlaceholder}
        />
      </div>
    </label>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card rounded-2xl border border-soft bg-[var(--card)] p-5 shadow-sm">
      <div className="border-b border-soft pb-4">
        <div className="text-lg font-semibold">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-muted">{subtitle}</div> : null}
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}

export default function CurrencyRatesPage() {
  const [settings, setSettings] = useState<AdminSettings>(EMPTY_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<AdminSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reasons, setReasons] = useState<ReasonMap>({});
  const [reasonDrafts, setReasonDrafts] = useState<ReasonMap>({});
  const [rateHistoryRows, setRateHistoryRows] = useState<RateHistoryRow[]>([]);
  const [admins, setAdmins] = useState<AdminOption[]>([]);

  function normalizeLoadedSettings(input?: Partial<AdminSettings> | null): AdminSettings {
    const safe = input ?? EMPTY_SETTINGS;
    const buyRate =
      toCleanString(safe.usd_buy_rate) || toCleanString(safe.esom_per_usd) || "0";
    const sellRate =
      toCleanString(safe.usd_sell_rate) || toCleanString(safe.esom_per_usd) || buyRate;
    return {
      ...EMPTY_SETTINGS,
      ...safe,
      usd_buy_rate: buyRate,
      usd_sell_rate: sellRate,
      esom_per_usd: toCleanString(safe.esom_per_usd) || buyRate,
    };
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const settingsData = await getAdminSettings();
        if (!alive) return;
        const normalizedSettings = normalizeLoadedSettings(settingsData);
        setSettings(normalizedSettings);
        setOriginalSettings(normalizedSettings);
        const loadedReasons = parseReasons(
          normalizedSettings.rates_change_reasons_json || "",
        );
        setReasons(loadedReasons);
        setReasonDrafts(loadedReasons);
      } catch (err: unknown) {
        if (!alive) return;
        setError(getErrorMessage(err, "Не удалось загрузить курсы"));
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
        const q = new URLSearchParams();
        q.set("limit", "500");
        q.set("offset", "0");
        q.set("sortLastName", "asc");
        q.set("sortFirstName", "asc");
        const res = await fetch(`/api/admin-management?${q.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load admins");
        const data = await res.json();
        const itemsSrc: any[] = data.items || data || [];
        const adminItems = Array.isArray(itemsSrc)
          ? itemsSrc.filter((item): item is AdminOption => Boolean(item && typeof item === "object"))
          : [];
        if (!alive) return;
        setAdmins(
          adminItems.map((admin: any) => ({
            id: String(admin.id),
            label:
              [admin.lastName ?? admin.last_name, admin.firstName ?? admin.first_name]
                .filter(Boolean)
                .join(" ") ||
              admin.email ||
              admin.login ||
              admin.username ||
              `#${admin.id}`,
            login: admin.email || admin.login || admin.username || "",
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
      try {
        const logs = await getAdminActionLogs({
          actionQuery: "PUT /blockchain-config/admin-settings",
          limit: 200,
          sortBy: "createdAt",
          sortDir: "desc",
        });
        if (!alive) return;
        setRateHistoryRows(
          extractCurrencyHistory(
            Array.isArray(logs?.items)
              ? logs.items.filter((item): item is AdminActionLog => Boolean(item && typeof item === "object"))
              : [],
          ),
        );
      } catch {
        if (!alive) return;
        setRateHistoryRows([]);
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

  function getAdminLabel(adminId: number) {
    return adminLookup.get(String(adminId)) || (adminId === 0 ? "Локально" : `#${adminId}`);
  }

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
        rates_change_reasons_json: JSON.stringify(nextReasons),
      };

      const savedSettings = await putAdminSettings(settingsPayload);

      setSettings((prev) => ({ ...prev, ...savedSettings }));
      setOriginalSettings((prev) => ({ ...prev, ...savedSettings }));
      setReasons(nextReasons);
      setReasonDrafts(nextReasons);
      setSuccess("Курсы валют сохранены");
      try {
        const logs = await getAdminActionLogs({
          actionQuery: "PUT /blockchain-config/admin-settings",
          limit: 200,
          sortBy: "createdAt",
          sortDir: "desc",
        });
        setRateHistoryRows(
          extractCurrencyHistory(
            Array.isArray(logs?.items)
              ? logs.items.filter((item): item is AdminActionLog => Boolean(item && typeof item === "object"))
              : [],
          ),
        );
      } catch {
        setRateHistoryRows([]);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Не удалось сохранить курсы"));
    } finally {
      setSaving(false);
    }
  }

  async function saveCurrencyRates() {
    if (!currencyRateChanged) {
      setSuccess("Курсы валют уже актуальны");
      return;
    }
    const missing = ["rate:usd_buy_rate", "rate:usd_sell_rate"].find(
      (key) => !getRateReason(key).trim(),
    );
    if (missing) {
      setError(`Укажите комментарий для поля: ${missing === "rate:usd_buy_rate" ? "Курс покупки USD" : "Курс продажи USD"}`);
      return;
    }
    await persistRates();
  }

  async function exportCurrencyHistoryCsv() {
    await exportRows({
      format: "csv",
      fileBaseName: "currency_rates_history",
      title: "История изменений курсов валют",
      columns: [
        {
          header: "Дата",
          getValue: (row: RateHistoryRow) => formatDateTime(row.createdAt),
        },
        {
          header: "Админ",
          getValue: (row: RateHistoryRow) => getAdminLabel(row.adminId),
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

  if (loading) {
    return <div className="m-auto text-muted">Загрузка...</div>;
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto pb-8">
      <div className="w-full max-w-[980px] px-4">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="rounded-full border border-soft bg-card/80 px-4 py-2 text-sm text-muted">
            Курс покупки и продажи USD с обязательным комментарием перед сохранением.
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
          title="Курсы валют"
          subtitle="Любое изменение требует комментарий рядом с полем перед сохранением."
        >
          <div className="grid gap-4">
            <GridValue
              label="Курс покупки USD"
              value={settings.usd_buy_rate}
              onChange={(value) => updateSetting("usd_buy_rate", value)}
              comment={getRateReason("rate:usd_buy_rate")}
              onCommentChange={(value) => updateReasonDraft("rate:usd_buy_rate", value)}
              placeholder="0"
              commentPlaceholder="Например: изменение курса по распоряжению финансового отдела"
            />
            <GridValue
              label="Курс продажи USD"
              value={settings.usd_sell_rate}
              onChange={(value) => updateSetting("usd_sell_rate", value)}
              comment={getRateReason("rate:usd_sell_rate")}
              onCommentChange={(value) => updateReasonDraft("rate:usd_sell_rate", value)}
              placeholder="0"
              commentPlaceholder="Например: изменение курса продажи после пересчёта"
            />
          </div>
          <div className="mt-5 flex justify-end">
            <button
              className="btn btn-primary h-10 px-4"
              onClick={saveCurrencyRates}
              disabled={saving}
            >
              {saving ? "Сохранение..." : "Сохранить курсы"}
            </button>
          </div>
        </Card>

        <div className="mt-8 rounded-2xl border border-soft bg-[var(--bg-soft)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-base font-semibold">История изменений</div>
              <div className="mt-1 text-sm text-muted">
                Дата, админ, изменения и комментарий по курсу покупки и продажи USD.
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
                {rateHistoryRows.length ? (
                  rateHistoryRows.map((row) => (
                    <tr key={`${row.createdAt}-${row.adminId}`} className="border-t border-soft">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDateTime(row.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{getAdminLabel(row.adminId)}</td>
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
      </div>
    </div>
  );
}
