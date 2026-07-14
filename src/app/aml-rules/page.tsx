"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import {
  getAdminActionLogs,
  getAdmins,
  getAntifraudRules,
  updateAntifraudRule,
  type AdminActionLog,
  type AntiFraudRule,
  type AntiFraudRuleUpdate,
} from "@/lib/api";
import { exportRows, type ExportFormat } from "@/lib/exporters";

type RuleField = "period_days" | "threshold_som" | "min_count" | "percent_threshold";

type RuleDraft = {
  enabled: boolean;
  period_days: string;
  threshold_som: string;
  min_count: string;
  percent_threshold: string;
};

type AdminOption = {
  id: string;
  label: string;
  login: string;
};

type RuleMeta = {
  title: string;
  description: string;
  fields: Array<{
    key: RuleField;
    label: string;
    type: "number" | "percent";
    hint?: string;
  }>;
};

const RULE_META: Record<string, RuleMeta> = {
  FIAT_ANY_GE_1M: {
    title: "Любая операция с фиатом",
    description: "Срабатывает, если операция в сомах превышает порог.",
    fields: [
      { key: "threshold_som", label: "Порог, СОМ", type: "number" },
    ],
  },
  ONE_TIME_GE_8M: {
    title: "Разовая крупная сделка",
    description: "Следит за единоразовыми крупными суммами.",
    fields: [
      { key: "threshold_som", label: "Сумма сделки, СОМ", type: "number" },
    ],
  },
  FREQUENT_OPS_3_30D_EACH_GE_100K: {
    title: "Частые операции",
    description: "Отслеживает много операций за период с минимальным порогом по каждой.",
    fields: [
      { key: "min_count", label: "Количество операций", type: "number" },
      { key: "period_days", label: "Период, дней", type: "number" },
      {
        key: "threshold_som",
        label: "Минимум одной операции, СОМ",
        type: "number",
      },
    ],
  },
  WITHDRAW_AFTER_LARGE_INFLOW: {
    title: "Вывод после крупного притока",
    description: "Срабатывает при выводе после недавнего крупного поступления.",
    fields: [
      {
        key: "percent_threshold",
        label: "Процент от притока, %",
        type: "percent",
      },
      {
        key: "threshold_som",
        label: "Порог входящего платежа, СОМ",
        type: "number",
      },
      { key: "period_days", label: "Период, дней", type: "number" },
    ],
  },
  SPLITTING_TOTAL_14D_GE_1M: {
    title: "Дробление суммы",
    description: "Отслеживает дробление операций в рамках периода.",
    fields: [
      { key: "threshold_som", label: "Сумма, СОМ", type: "number" },
      { key: "period_days", label: "Период, дней", type: "number" },
    ],
  },
  THIRD_PARTY_DEPOSITS_3_30D_TOTAL_GE_1M: {
    title: "Внесения третьими лицами",
    description: "Отслеживает пополнения от разных людей на один счёт.",
    fields: [
      { key: "min_count", label: "Количество лиц", type: "number" },
      { key: "period_days", label: "Период, дней", type: "number" },
      { key: "threshold_som", label: "Общая сумма, СОМ", type: "number" },
    ],
  },
  AFTER_INACTIVITY_6M: {
    title: "Активность после паузы",
    description: "Срабатывает после длительной неактивности аккаунта.",
    fields: [
      { key: "period_days", label: "Период неактивности, дней", type: "number" },
    ],
  },
  MANY_SENDERS_TO_ONE_10_PER_MONTH: {
    title: "Много отправителей на один счёт",
    description: "Считает количество разных отправителей за период.",
    fields: [
      { key: "min_count", label: "Количество физлиц", type: "number" },
      { key: "period_days", label: "Период, дней", type: "number" },
    ],
  },
};

const SOURCES_STORAGE_KEY = "aml-rules:sources:v1";

function toDraftValue(value: unknown): string {
  if (value == null || value === "") return "";
  return String(value);
}

function createDraft(rule: AntiFraudRule): RuleDraft {
  return {
    enabled: Boolean(rule.enabled),
    period_days: toDraftValue(rule.period_days),
    threshold_som: toDraftValue(rule.threshold_som),
    min_count: toDraftValue(rule.min_count),
    percent_threshold: toDraftValue(rule.percent_threshold),
  };
}

function parseNumber(value: string): number | undefined {
  const normalized = value.trim().replace(/\s+/g, "").replace(",", ".");
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sameNumber(a: unknown, b: string): boolean {
  const left = parseNumber(toDraftValue(a));
  const right = parseNumber(b);
  if (left == null && right == null) return true;
  return left === right;
}

function normalizeSources(raw: string): string[] {
  const tokens = raw
    .split(/[\n,;]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
  const result: string[] = [];
  const seen = new Set<string>();
  for (const token of tokens) {
    if (seen.has(token)) continue;
    seen.add(token);
    result.push(token);
  }
  return result;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleString("ru-RU");
}

function formatChangedFields(details: any): string {
  const rawBody = details?.body ?? details?.data ?? details;
  if (!rawBody || typeof rawBody !== "object") return "—";
  const entries = Object.entries(rawBody as Record<string, unknown>).filter(
    ([key, value]) =>
      key !== "comment" && value != null && String(value).trim() !== "",
  );
  if (!entries.length) return "—";
  return entries
    .map(([key, value]) => `${key}: ${formatValue(value)}`)
    .join("; ");
}

function extractComment(details: any): string {
  const rawBody = details?.body ?? details?.data ?? details;
  if (!rawBody || typeof rawBody !== "object") return "—";
  const comment =
    (rawBody as Record<string, unknown>).comment ??
    (rawBody as Record<string, unknown>).reason ??
    "";
  return String(comment || "—");
}

function formatValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  if (typeof value === "number") return Number(value).toLocaleString("ru-RU");
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "—";
    }
  }
  return String(value);
}

function getRuleLabel(key: string): string {
  return RULE_META[key]?.title || key;
}

function getRuleDescription(key: string): string {
  return RULE_META[key]?.description || "Настройка правила антифрода.";
}

function getRuleFields(key: string): RuleMeta["fields"] {
  return RULE_META[key]?.fields || [];
}

function buildUpdatePayload(
  rule: AntiFraudRule,
  draft: RuleDraft,
): AntiFraudRuleUpdate {
  const payload: AntiFraudRuleUpdate = {};
  if (Boolean(rule.enabled) !== draft.enabled) payload.enabled = draft.enabled;
  if (!sameNumber(rule.period_days, draft.period_days)) {
    const num = parseNumber(draft.period_days);
    if (num != null) payload.period_days = num.toString();
  }
  if (!sameNumber(rule.threshold_som, draft.threshold_som)) {
    const num = parseNumber(draft.threshold_som);
    if (num != null) payload.threshold_som = num.toString();
  }
  if (!sameNumber(rule.min_count, draft.min_count)) {
    const num = parseNumber(draft.min_count);
    if (num != null) payload.min_count = num.toString();
  }
  if (!sameNumber(rule.percent_threshold, draft.percent_threshold)) {
    const num = parseNumber(draft.percent_threshold);
    if (num != null) payload.percent_threshold = num.toString();
  }
  return payload;
}

function isRuleDirty(rule: AntiFraudRule, draft: RuleDraft): boolean {
  if (Boolean(rule.enabled) !== draft.enabled) return true;
  if (!sameNumber(rule.period_days, draft.period_days)) return true;
  if (!sameNumber(rule.threshold_som, draft.threshold_som)) return true;
  if (!sameNumber(rule.min_count, draft.min_count)) return true;
  if (!sameNumber(rule.percent_threshold, draft.percent_threshold)) return true;
  return false;
}

function validateDraft(rule: AntiFraudRule, draft: RuleDraft): string | null {
  const fields = getRuleFields(rule.key);
  for (const field of fields) {
    const value = draft[field.key];
    if (!value.trim()) return `Заполните поле "${field.label}"`;
    const num = parseNumber(value);
    if (num == null) return `Поле "${field.label}" должно быть числом`;
    if (num < 0) return `Поле "${field.label}" должно быть не меньше 0`;
    if (field.type === "percent" && (num < 0 || num > 100)) {
      return `Поле "${field.label}" должно быть от 0 до 100`;
    }
  }
  return null;
}

export default function AmlRulesPage() {
  const [apiDraft, setApiDraft] = useState("");
  const [urlDraft, setUrlDraft] = useState("");
  const [fileName, setFileName] = useState("");
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [history, setHistory] = useState<AdminActionLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyExporting, setHistoryExporting] =
    useState<ExportFormat | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("aml-rules:stubs:v1") || "";
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        setApiDraft(String(parsed.api ?? ""));
        setUrlDraft(String(parsed.urls ?? ""));
        setFileName(String(parsed.fileName ?? ""));
      }
    } catch {
      // Keep empty defaults when local storage is unavailable.
    }
    void loadAdmins();
    void loadHistory();
  }, []);

  async function loadAdmins() {
    try {
      const res = await getAdmins({ limit: 500, offset: 0 });
      setAdmins(
        res.items.map((admin) => ({
          id: admin.id,
          label:
            [admin.firstName, admin.lastName].filter(Boolean).join(" ") ||
            admin.login ||
            `#${admin.id}`,
          login: admin.login,
        })),
      );
    } catch {
      setAdmins([]);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await getAdminActionLogs({
        offset: 0,
        limit: 50,
        sortBy: "createdAt",
        sortDir: "desc",
        actionQuery: "antifraud/rules",
      });
      setHistory(res.items);
    } catch (e) {
      setHistoryError(
        e instanceof Error ? e.message : "Не удалось загрузить историю",
      );
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  const adminLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const admin of admins) map.set(admin.id, admin.label);
    return map;
  }, [admins]);

  const urlLines = useMemo(() => normalizeSources(urlDraft), [urlDraft]);

  const historyExportRows = useMemo(
    () =>
      history.map((item) => {
        const details = parseDetails(item.details);
        return {
          date: item.createdAt,
          user:
            adminLookup.get(String(item.admin_id)) ||
            (item.admin_id === 0 ? "Локально" : `Админ #${item.admin_id}`),
          action: item.action,
          changed: formatChangedFields(details),
          comment: extractComment(details),
          ip: item.ip,
        };
      }),
    [adminLookup, history],
  );

  async function saveStubSettings() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        api: apiDraft.trim(),
        urls: urlLines,
        fileName: fileName.trim(),
      };
      window.localStorage.setItem("aml-rules:stubs:v1", JSON.stringify(payload));
      const summary = [
        apiDraft.trim() ? `API: ${apiDraft.trim()}` : "",
        urlLines.length ? `URL: ${urlLines.length}` : "",
        fileName.trim() ? `FILE: ${fileName.trim()}` : "",
      ]
        .filter(Boolean)
        .join(" | ") || "Заглушки AML обновлены";

      const synthetic: AdminActionLog = {
        id: Date.now(),
        admin_id: 0,
        ip: "local",
        action: "AML stubs updated",
        details: JSON.stringify({
          body: {
            api: apiDraft.trim(),
            urls: urlLines,
            fileName: fileName.trim(),
            comment: summary,
          },
        }),
        createdAt: new Date().toISOString(),
      };

      setHistory((prev) => [synthetic, ...prev]);
      setSuccess("Заглушки AML сохранены");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось сохранить AML-заглушки",
      );
    } finally {
      setSaving(false);
    }
  }

  async function exportHistoryCsv() {
    if (!historyExportRows.length || historyExporting) return;
    setHistoryExporting("csv");
    try {
      await exportRows({
        format: "csv",
        fileBaseName: "aml_history",
        title: "AML история",
        columns: [
          { header: "Дата", getValue: (row) => formatDate(row.date) },
          { header: "Пользователь", getValue: (row) => row.user },
          { header: "Действие", getValue: (row) => row.action },
          { header: "Что поменял", getValue: (row) => row.changed },
          { header: "Комментарий", getValue: (row) => row.comment },
          { header: "IP", getValue: (row) => row.ip },
        ],
        rows: historyExportRows,
      });
    } finally {
      setHistoryExporting(null);
    }
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto pb-8">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4">
        <section className="card rounded-3xl border border-soft shadow-sm overflow-hidden">
          <div className="grid gap-4 border-b border-soft px-5 py-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-soft bg-[var(--bg-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  AML
                </span>
                <span className="inline-flex rounded-full border border-soft bg-[var(--bg-soft)] px-3 py-1 text-xs text-muted">
                  Заглушки: API, URL-список и файл
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-semibold">
                AML-заглушки
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                Пока здесь три поля заглушек: API, URL-список и файл. После сохранения ниже обновится история.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              <button
                className="btn btn-primary h-11 w-full lg:w-auto"
                disabled={saving}
                onClick={() => {
                  void saveStubSettings();
                }}
              >
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>

          {(error || success) && (
            <div className="border-b border-soft px-5 py-3">
              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                  {error}
                </div>
              ) : null}
              {!error && success ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                  {success}
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="card rounded-3xl border border-soft shadow-sm overflow-hidden">
          <div className="grid gap-4 border-b border-soft px-5 py-4">
            <div className="text-lg font-semibold">
              Поля заглушек AML
            </div>
            <div className="text-sm text-muted">
              Здесь пока только тестовые поля. Логику правил из control пока не трогаем.
            </div>
          </div>
          <div className="grid gap-4 p-5">
            <label className="grid gap-1">
              <span className="text-xs text-muted">
                Вставить API
              </span>
              <input
                className="ui-input"
                value={apiDraft}
                onChange={(e) => setApiDraft(e.target.value)}
                placeholder="https://api.example.com/aml"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs text-muted">
                Вставить URL-ы
              </span>
              <textarea
                className="ui-input min-h-36 resize-y leading-6"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder={[
                  "https://example.com/aml-source-1",
                  "https://example.com/aml-source-2",
                ].join("\n")}
              />
              <div className="text-xs text-muted">
                {urlLines.length
                  ? `Всего URL: ${urlLines.length}`
                  : "Список URL пока пуст"}
              </div>
            </label>

            <label className="grid gap-1">
              <span className="text-xs text-muted">
                Вставить файл
              </span>
              <input
                className="ui-input"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setFileName(file ? file.name : "");
                }}
              />
              <div className="text-xs text-muted">
                {fileName ? `${"Выбрано"}: ${fileName}` : "Файл пока не выбран"}
              </div>
            </label>
          </div>
        </section>

        <section className="card rounded-3xl border border-soft shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-soft px-5 py-4">
            <div>
              <div className="text-lg font-semibold">
                История AML
              </div>
              <div className="mt-1 text-sm text-muted">
                Дата, кто изменил, что поменял и комментарий.
              </div>
            </div>
            <button
              className="btn h-10 px-3"
              type="button"
              onClick={exportHistoryCsv}
              disabled={!historyExportRows.length || historyExporting === "csv"}
            >
              {historyExporting === "csv" ? "CSV..." : "CSV"}
            </button>
          </div>
          <div className="max-h-[560px] overflow-auto">
            {historyLoading ? (
              <div className="p-5 text-sm text-muted">
                Загрузка истории...
              </div>
            ) : historyError ? (
              <div className="p-5 text-sm text-red-600">{historyError}</div>
            ) : history.length ? (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-[1] bg-[var(--card)] text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <tr className="border-b border-soft">
                    <th className="px-5 py-3">
                      Дата
                    </th>
                    <th className="px-5 py-3">
                      Пользователь
                    </th>
                    <th className="px-5 py-3">
                      Что поменял
                    </th>
                    <th className="px-5 py-3">
                      Комментарий
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => {
                    const adminLabel =
                      adminLookup.get(String(item.admin_id)) ||
                      (item.admin_id === 0
                        ? "Локально"
                        : `Админ #${item.admin_id}`);
                    const details = parseDetails(item.details);
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-black/10 transition-colors last:border-b-0 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                      >
                        <td className="px-5 py-4 whitespace-nowrap text-muted">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium">{adminLabel}</div>
                          <div className="text-xs text-muted">{item.action}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="max-w-[520px] break-words text-sm leading-6">
                            {formatChangedFields(details)}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="max-w-[360px] break-words text-sm leading-6 text-muted">
                            {extractComment(details)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-5 text-sm text-muted">
                Пока нет истории AML.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function parseDetails(value: any): any {

  if (value == null) return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
