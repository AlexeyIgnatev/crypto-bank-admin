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
import { COMMENT_PROMPT, COMMENT_REQUIRED_MESSAGE } from "@/lib/commentPrompt";
import type { TariffCategory } from "@/types";

type RuleField = "period_days" | "threshold_som" | "min_count" | "percent_threshold";

type RuleDraft = {
  enabled: boolean;
  period_days: string;
  threshold_som: string;
  min_count: string;
  percent_threshold: string;
};

type RuleMeta = {
  title: string;
  description: string;
  fields: Array<{
    key: RuleField;
    label: string;
    kind: "number" | "percent";
  }>;
};

type AdminOption = {
  id: string;
  label: string;
  login: string;
};

type ControlHistoryRow = {
  createdAt: string;
  adminId: number;
  adminName: string;
  ruleTitle: string;
  changes: string;
  comment: string;
  ip: string;
};

const CATEGORY_META: Record<TariffCategory, { title: string; description: string }> = {
  K1: {
    title: "K1",
    description: "Базовая категория финконтроля.",
  },
  K2: {
    title: "K2",
    description: "Усиленный контроль для отдельных сценариев.",
  },
  K3: {
    title: "K3",
    description: "Самая строгая категория контроля.",
  },
  K4: {
    title: "K4",
    description: "Дополнительная категория финконтроля.",
  },
  K5: {
    title: "K5",
    description: "Дополнительная категория финконтроля.",
  },
  K6: {
    title: "K6",
    description: "Дополнительная категория финконтроля.",
  },
};

const RULE_META: Record<string, RuleMeta> = {
  FIAT_ANY_GE_1M: {
    title: "Крупная операция с фиатом",
    description: "Срабатывает, если операция в сомах превышает заданный порог.",
    fields: [{ key: "threshold_som", label: "Порог, SOM", kind: "number" }],
  },
  ONE_TIME_GE_8M: {
    title: "Разовая крупная сделка",
    description: "Контроль одной большой операции.",
    fields: [{ key: "threshold_som", label: "Сумма сделки, SOM", kind: "number" }],
  },
  FREQUENT_OPS_3_30D_EACH_GE_100K: {
    title: "Частые операции",
    description: "Считывает частые операции за период и минимальную сумму каждой.",
    fields: [
      { key: "min_count", label: "Количество операций", kind: "number" },
      { key: "period_days", label: "Период, дней", kind: "number" },
      {
        key: "threshold_som",
        label: "Минимум одной операции, SOM",
        kind: "number",
      },
    ],
  },
  WITHDRAW_AFTER_LARGE_INFLOW: {
    title: "Вывод после крупного поступления",
    description: "Срабатывает при выводе после недавнего крупного поступления.",
    fields: [
      { key: "percent_threshold", label: "Процент от поступления, %", kind: "percent" },
      { key: "threshold_som", label: "Порог поступления, SOM", kind: "number" },
      { key: "period_days", label: "Период, дней", kind: "number" },
    ],
  },
  SPLITTING_TOTAL_14D_GE_1M: {
    title: "Дробление суммы",
    description: "Слежение за суммарным дроблением операций в рамках периода.",
    fields: [
      { key: "threshold_som", label: "Сумма, SOM", kind: "number" },
      { key: "period_days", label: "Период, дней", kind: "number" },
    ],
  },
  THIRD_PARTY_DEPOSITS_3_30D_TOTAL_GE_1M: {
    title: "Внесения третьими лицами",
    description: "Контроль пополнений от разных людей на один счет.",
    fields: [
      { key: "min_count", label: "Количество лиц", kind: "number" },
      { key: "period_days", label: "Период, дней", kind: "number" },
      { key: "threshold_som", label: "Общая сумма, SOM", kind: "number" },
    ],
  },
  AFTER_INACTIVITY_6M: {
    title: "Активность после паузы",
    description: "Срабатывает после длительного простоя счета.",
    fields: [{ key: "period_days", label: "Пауза, дней", kind: "number" }],
  },
  MANY_SENDERS_TO_ONE_10_PER_MONTH: {
    title: "Много отправителей на один счет",
    description: "Считает количество разных отправителей за период.",
    fields: [
      { key: "min_count", label: "Количество физлиц", kind: "number" },
      { key: "period_days", label: "Период, дней", kind: "number" },
    ],
  },
};

const RULE_ORDER = [
  "FIAT_ANY_GE_1M",
  "ONE_TIME_GE_8M",
  "FREQUENT_OPS_3_30D_EACH_GE_100K",
  "WITHDRAW_AFTER_LARGE_INFLOW",
  "SPLITTING_TOTAL_14D_GE_1M",
  "THIRD_PARTY_DEPOSITS_3_30D_TOTAL_GE_1M",
  "AFTER_INACTIVITY_6M",
  "MANY_SENDERS_TO_ONE_10_PER_MONTH",
] as const;

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

function buildUpdatePayload(
  rule: AntiFraudRule,
  draft: RuleDraft,
): AntiFraudRuleUpdate {
  const payload: AntiFraudRuleUpdate = {};
  if (Boolean(rule.enabled) !== draft.enabled) payload.enabled = draft.enabled;
  if (!sameNumber(rule.period_days, draft.period_days)) {
    const num = parseNumber(draft.period_days);
    if (num != null) payload.period_days = num;
  }
  if (!sameNumber(rule.threshold_som, draft.threshold_som)) {
    const num = parseNumber(draft.threshold_som);
    if (num != null) payload.threshold_som = num.toString();
  }
  if (!sameNumber(rule.min_count, draft.min_count)) {
    const num = parseNumber(draft.min_count);
    if (num != null) payload.min_count = num;
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
  const meta = RULE_META[rule.key];
  for (const field of meta.fields) {
    const value = draft[field.key];
    if (!value.trim()) return `Заполните поле "${field.label}"`;
    const num = parseNumber(value);
    if (num == null) return `Поле "${field.label}" должно быть числом`;
    if (num < 0) return `Поле "${field.label}" должно быть не меньше 0`;
    if (field.kind === "percent" && (num < 0 || num > 100)) {
      return `Поле "${field.label}" должно быть от 0 до 100`;
    }
  }
  return null;
}

function formatNumber(value: unknown): string {
  const n = parseNumber(toDraftValue(value));
  if (n == null) return "—";
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 18 });
}

function formatSummary(rule: AntiFraudRule, draft: RuleDraft): string {
  const meta = RULE_META[rule.key];
  const values = meta.fields
    .map((field) => `${field.label}: ${formatNumber(draft[field.key])}`)
    .join(" | ");
  return `${rule.enabled ? "Активно" : "Неактивно"}${values ? ` | ${values}` : ""}`;
}

function sortRules(rules: AntiFraudRule[]): AntiFraudRule[] {
  const order = new Map(RULE_ORDER.map((key, index) => [key, index]));
  return [...rules].sort((a, b) => {
    const ai = order.get(a.key) ?? Number.MAX_SAFE_INTEGER;
    const bi = order.get(b.key) ?? Number.MAX_SAFE_INTEGER;
    return ai - bi;
  });
}

function parseActionDetails(details: unknown): Record<string, unknown> | null {
  if (!details) return null;
  if (typeof details === "object") return details as Record<string, unknown>;
  if (typeof details !== "string") return null;
  try {
    const parsed = JSON.parse(details);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function toText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join(", ");
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return "";
}

function extractComment(details: unknown): string {
  const body = (parseActionDetails(details)?.body ??
    parseActionDetails(details)?.data ??
    parseActionDetails(details)?.payload ??
    parseActionDetails(details)) as Record<string, unknown> | null;
  if (!body) return "Комментарий не указан";

  const comment = [
    body.comment,
    body.reason,
    body.note,
    body.message,
  ]
    .map((item) => toText(item).trim())
    .find(Boolean);

  return comment || "Комментарий не указан";
}

function formatControlValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "вкл." : "выкл.";
  const text = String(value).trim();
  if (!text) return "—";
  const normalized = text.replace(",", ".");
  const num = Number(normalized);
  if (Number.isFinite(num) && /^-?\d+(\.\d+)?$/.test(normalized)) {
    return num.toLocaleString("ru-RU", { maximumFractionDigits: 18 });
  }
  return text;
}

function shortControlDiff(label: string, before: unknown, after: unknown): string | null {
  const prev = formatControlValue(before);
  const next = formatControlValue(after);
  if (prev === next) return null;
  return `${label}: ${prev} → ${next}`;
}

function buildControlHistorySummary(
  current: Record<string, unknown>,
  previous: Record<string, unknown> | null,
  ruleTitle: string,
): string | null {
  const prev = previous || {};
  const parts = [
    shortControlDiff("Включение", prev.enabled, current.enabled),
    shortControlDiff("Период", prev.period_days, current.period_days),
    shortControlDiff("Порог", prev.threshold_som, current.threshold_som),
    shortControlDiff("Кол-во", prev.min_count, current.min_count),
    shortControlDiff("Процент", prev.percent_threshold, current.percent_threshold),
  ].filter(Boolean) as string[];

  if (!parts.length) return null;
  return `${ruleTitle}: ${parts.join("; ")}`;
}

function extractControlHistory(
  logs: AdminActionLog[],
  selectedCategory: TariffCategory,
): ControlHistoryRow[] {
  const ordered = [...logs].filter(Boolean).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const previousByRule = new Map<string, Record<string, unknown>>();

  return ordered
    .map((log) => {
      const details = parseActionDetails(log.details);
      const query = (details?.query && typeof details.query === "object"
        ? details.query
        : {}) as Record<string, unknown>;
      const params = (details?.params && typeof details.params === "object"
        ? details.params
        : {}) as Record<string, unknown>;
      const body = (details?.body && typeof details.body === "object"
        ? details.body
        : details?.data && typeof details.data === "object"
          ? details.data
          : details?.payload && typeof details.payload === "object"
            ? details.payload
            : details && typeof details === "object"
              ? details
              : {}) as Record<string, unknown>;

      const category = String(query.category ?? body.category ?? "").trim().toUpperCase();
      if (category && category !== selectedCategory) return null;

      const key = String(params.key ?? body.key ?? query.key ?? "").trim();
      if (!key) return null;

      const current = {
        enabled: body.enabled,
        period_days: body.period_days,
        threshold_som: body.threshold_som,
        min_count: body.min_count,
        percent_threshold: body.percent_threshold,
      };
      const previous = previousByRule.get(`${category || selectedCategory}:${key}`) ?? null;
      previousByRule.set(`${category || selectedCategory}:${key}`, current);

      const changes = buildControlHistorySummary(
        current,
        previous,
        RULE_META[key]?.title ?? key,
      );
      if (!changes) return null;

      return {
        createdAt: log.createdAt,
        adminId: log.admin_id,
        adminName: "",
        ruleTitle: RULE_META[key]?.title ?? key,
        changes,
        comment: extractComment(details),
        ip: log.ip,
      };
    })
    .filter((row): row is ControlHistoryRow => Boolean(row))
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export default function ControlPage() {
  const [selectedCategory, setSelectedCategory] = useState<TariffCategory>("K1");
  const [rules, setRules] = useState<AntiFraudRule[]>([]);
  const [drafts, setDrafts] = useState<Record<string, RuleDraft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [history, setHistory] = useState<AdminActionLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyExporting, setHistoryExporting] = useState<ExportFormat | null>(null);
  const [admins, setAdmins] = useState<AdminOption[]>([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setSaveMessage(null);
    (async () => {
      try {
        const list = sortRules(await getAntifraudRules(selectedCategory));
        if (!alive) return;
        setRules(list);
        const nextDrafts: Record<string, RuleDraft> = {};
        for (const rule of list) nextDrafts[rule.key] = createDraft(rule);
        setDrafts(nextDrafts);
      } catch (e) {
        if (!alive) return;
        setError(
          e instanceof Error ? e.message : "Не удалось загрузить правила контроля",
        );
        setRules([]);
        setDrafts({});
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedCategory]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [adminsRes, logsRes] = await Promise.all([
          getAdmins({ limit: 500, offset: 0, sortLastName: "asc", sortFirstName: "asc" }),
          getAdminActionLogs({
            offset: 0,
            limit: 300,
            sortBy: "createdAt",
            sortDir: "desc",
            actionQuery: "PUT /antifraud/rules",
          }),
        ]);
        if (!alive) return;
        setAdmins(
          adminsRes.items.map((admin) => ({
            id: admin.id,
            label:
              [admin.lastName, admin.firstName].filter(Boolean).join(" ") ||
              admin.login ||
              `#${admin.id}`,
            login: admin.login,
          })),
        );
        setHistory(logsRes.items);
      } catch (e) {
        if (!alive) return;
        setAdmins([]);
        setHistory([]);
        setHistoryError(e instanceof Error ? e.message : "Не удалось загрузить историю");
      } finally {
        if (alive) setHistoryLoading(false);
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

  const historyRows = useMemo(
    () =>
      extractControlHistory(history, selectedCategory).map((row) => ({
        ...row,
        adminName: adminLookup.get(String(row.adminId)) || `#${row.adminId}`,
      })),
    [adminLookup, history, selectedCategory],
  );

  const dirtyKeys = useMemo(
    () =>
      rules
        .filter((rule) => {
          const draft = drafts[rule.key];
          return draft ? isRuleDirty(rule, draft) : false;
        })
        .map((rule) => rule.key),
    [drafts, rules],
  );

  const dirtyRules = useMemo(
    () => rules.filter((rule) => dirtyKeys.includes(rule.key)),
    [dirtyKeys, rules],
  );

  const enabledCount = useMemo(
    () => rules.filter((rule) => drafts[rule.key]?.enabled ?? rule.enabled).length,
    [drafts, rules],
  );

  const hasChanges = dirtyRules.length > 0;

  async function saveChanges(comment: string) {
    if (!hasChanges) {
      setSaveMessage("Изменений нет");
      return;
    }
    for (const rule of dirtyRules) {
      const draft = drafts[rule.key];
      if (!draft) continue;
      const validationError = validateDraft(rule, draft);
      if (validationError) {
        setError(`Проверьте правило "${RULE_META[rule.key].title}": ${validationError}`);
        return;
      }
    }

    setSaving(true);
    setError(null);
    setSaveMessage(null);
    try {
      const nonEmptyComment = comment.trim();
      for (const rule of dirtyRules) {
        const draft = drafts[rule.key];
        if (!draft) continue;
        const payload = buildUpdatePayload(rule, draft);
        if (!Object.keys(payload).length) continue;
        await updateAntifraudRule(
          rule.key,
          {
            ...payload,
            comment: nonEmptyComment,
          },
          selectedCategory,
        );
      }
      const refreshed = sortRules(await getAntifraudRules(selectedCategory));
      setRules(refreshed);
      const nextDrafts: Record<string, RuleDraft> = {};
      for (const rule of refreshed) nextDrafts[rule.key] = createDraft(rule);
      setDrafts(nextDrafts);
      try {
        const logsRes = await getAdminActionLogs({
          offset: 0,
          limit: 300,
          sortBy: "createdAt",
          sortDir: "desc",
          actionQuery: "PUT /antifraud/rules",
        });
        setHistory(logsRes.items);
        setHistoryError(null);
      } catch {
        setHistory([]);
      }
      setSaveMessage("Правила сохранены");
      setCommentOpen(false);
      setCommentDraft("");
      setCommentError(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось сохранить правила контроля",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto pb-8">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4">
        <section className="card overflow-hidden rounded-3xl border border-soft shadow-sm">
          <div className="grid gap-4 border-b border-soft px-5 py-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-soft bg-[var(--bg-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Фин контроль
                </span>
                <span className="inline-flex rounded-full border border-soft bg-[var(--bg-soft)] px-3 py-1 text-xs text-muted">
                  Категория: {selectedCategory}
                </span>
              </div>
              <div className="mt-3 text-2xl font-semibold">Категории K1-K6</div>
              <div className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                Для каждой категории настраивается свой набор правил и числовых порогов.
                Изменения сохраняются отдельно по выбранной категории.
              </div>
            </div>

            <div className="flex flex-wrap gap-2 rounded-2xl border border-soft bg-[var(--bg-soft)] p-2">
              {(Object.keys(CATEGORY_META) as TariffCategory[]).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    selectedCategory === category
                      ? "bg-[var(--primary)] text-white shadow-sm"
                      : "text-muted hover:bg-white/70 hover:text-fg dark:hover:bg-white/5"
                  }`}
                >
                  {CATEGORY_META[category].title}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 border-b border-soft px-5 py-4 md:grid-cols-3">
            <div className="rounded-2xl border border-soft bg-[var(--bg-soft)] px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-muted">Всего правил</div>
              <div className="mt-1 text-xl font-semibold">{rules.length}</div>
            </div>
            <div className="rounded-2xl border border-soft bg-[var(--bg-soft)] px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-muted">Активно</div>
              <div className="mt-1 text-xl font-semibold">{enabledCount}</div>
            </div>
            <div className="rounded-2xl border border-soft bg-[var(--bg-soft)] px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-muted">Изменено</div>
              <div className="mt-1 text-xl font-semibold">{dirtyRules.length}</div>
            </div>
          </div>

          {(error || saveMessage) && (
            <div className="border-b border-soft px-5 py-3">
              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                  {error}
                </div>
              ) : null}
              {!error && saveMessage ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                  {saveMessage}
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="card overflow-hidden rounded-3xl border border-soft shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-soft px-5 py-4">
            <div>
              <div className="text-lg font-semibold">Правила категории {selectedCategory}</div>
              <div className="text-sm text-muted">{CATEGORY_META[selectedCategory].description}</div>
            </div>
            <button
              type="button"
              className={`btn btn-primary h-10 ${!hasChanges || saving ? "opacity-60" : ""}`}
              disabled={!hasChanges || saving}
              onClick={() => {
                setCommentError(null);
                if (!hasChanges) return;
                setCommentOpen(true);
              }}
            >
              {saving ? "Сохранение..." : "Сохранить изменения"}
            </button>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="rounded-2xl border border-soft bg-[var(--bg-soft)] px-4 py-6 text-sm text-muted">
                Загрузка правил...
              </div>
            ) : rules.length ? (
              <div className="grid gap-4">
                {rules.map((rule) => {
                  const draft = drafts[rule.key] || createDraft(rule);
                  const meta = RULE_META[rule.key];
                  const dirty = dirtyKeys.includes(rule.key);
                  const validationError = validateDraft(rule, draft);
                  return (
                    <article
                      key={rule.key}
                      className={`rounded-2xl border p-4 shadow-sm transition ${
                        dirty
                          ? "border-[color-mix(in_srgb,var(--primary)_35%,var(--border-color))] bg-[color-mix(in_srgb,var(--primary)_4%,var(--card))]"
                          : "border-soft bg-[var(--card)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold">{meta.title}</h3>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                                draft.enabled
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {draft.enabled ? "Активно" : "Неактивно"}
                            </span>
                            {dirty ? (
                              <span className="rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-2.5 py-1 text-[11px] font-semibold text-[var(--primary)]">
                                Изменено
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-sm leading-6 text-muted">{meta.description}</div>
                          <div className="mt-2 text-xs leading-5 text-muted">
                            {formatSummary(rule, draft)}
                          </div>
                        </div>

                        <button
                          type="button"
                          className={`inline-flex h-9 items-center rounded-full border px-4 text-sm font-semibold transition-colors ${
                            draft.enabled
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
                              : "border-soft bg-[var(--bg-soft)] text-muted hover:bg-[color-mix(in_srgb,var(--primary)_5%,var(--bg-soft))]"
                          }`}
                          onClick={() =>
                            setDrafts((prev) => ({
                              ...prev,
                              [rule.key]: {
                                ...draft,
                                enabled: !draft.enabled,
                              },
                            }))
                          }
                        >
                          {draft.enabled ? "Активно" : "Выкл."}
                        </button>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3">
                        {meta.fields.map((field) => (
                          <label key={field.key} className="block text-sm">
                            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
                              {field.label}
                            </span>
                            <input
                              className="ui-input w-full"
                              type="number"
                              inputMode="decimal"
                              step={field.kind === "percent" ? "0.1" : "1"}
                              value={draft[field.key]}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [rule.key]: {
                                    ...draft,
                                    [field.key]: e.target.value,
                                  },
                                }))
                              }
                            />
                          </label>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
                        <span>Ключ: {rule.key}</span>
                        <span>Обновлено: {new Date(rule.updatedAt).toLocaleString("ru-RU")}</span>
                      </div>

                      {validationError ? (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                          {validationError}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-soft bg-[var(--bg-soft)] px-4 py-6 text-sm text-muted">
                Нет правил для этой категории.
              </div>
            )}
          </div>
        </section>

        <section className="card overflow-hidden rounded-3xl border border-soft shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-soft px-5 py-4">
            <div>
              <div className="text-lg font-semibold">История изменений</div>
              <div className="text-sm text-muted">
                Краткие изменения по правилам финконтроля с комментариями администратора.
              </div>
            </div>
            <button
              type="button"
              className="btn h-10 px-4"
              onClick={async () => {
                if (!historyRows.length || historyExporting) return;
                setHistoryExporting("csv");
                try {
                  await exportRows({
                    format: "csv",
                    fileBaseName: "antifraud_history",
                    title: "История изменений финконтроля",
                    columns: [
                      {
                        header: "Дата",
                        getValue: (row: ControlHistoryRow) =>
                          new Date(row.createdAt).toLocaleString("ru-RU"),
                      },
                      { header: "Админ", getValue: (row: ControlHistoryRow) => row.adminName },
                      { header: "Изменения", getValue: (row: ControlHistoryRow) => row.changes },
                      { header: "Комментарий", getValue: (row: ControlHistoryRow) => row.comment },
                      { header: "IP", getValue: (row: ControlHistoryRow) => row.ip },
                    ],
                    rows: historyRows,
                  });
                } finally {
                  setHistoryExporting(null);
                }
              }}
              disabled={!historyRows.length || Boolean(historyExporting)}
            >
              {historyExporting === "csv" ? "CSV..." : "CSV"}
            </button>
            <button
              type="button"
              className="btn h-10 px-4"
              onClick={async () => {
                if (!historyRows.length || historyExporting) return;
                setHistoryExporting("pdf");
                try {
                  await exportRows({
                    format: "pdf",
                    fileBaseName: "antifraud_history",
                    title: "История изменений финконтроля",
                    columns: [
                      {
                        header: "Дата",
                        getValue: (row: ControlHistoryRow) =>
                          new Date(row.createdAt).toLocaleString("ru-RU"),
                      },
                      { header: "Админ", getValue: (row: ControlHistoryRow) => row.adminName },
                      { header: "Изменения", getValue: (row: ControlHistoryRow) => row.changes },
                      { header: "Комментарий", getValue: (row: ControlHistoryRow) => row.comment },
                      { header: "IP", getValue: (row: ControlHistoryRow) => row.ip },
                    ],
                    rows: historyRows,
                  });
                } finally {
                  setHistoryExporting(null);
                }
              }}
              disabled={!historyRows.length || Boolean(historyExporting)}
            >
              {historyExporting === "pdf" ? "PDF..." : "PDF"}
            </button>
          </div>
          <div className="max-h-[460px] overflow-auto">
            {historyLoading ? (
              <div className="p-5 text-sm text-muted">Загрузка истории...</div>
            ) : historyError ? (
              <div className="p-5 text-sm text-red-600">{historyError}</div>
            ) : historyRows.length ? (
              <table className="w-full min-w-[1080px] text-sm">
                <thead className="sticky top-0 z-[1] bg-[var(--card)] text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <tr className="border-b border-soft">
                    <th className="px-5 py-3">Дата</th>
                    <th className="px-5 py-3">Админ</th>
                    <th className="px-5 py-3">Изменения</th>
                    <th className="px-5 py-3">Комментарий</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((row) => (
                    <tr key={`${row.createdAt}-${row.adminId}-${row.ruleTitle}`} className="border-b border-soft last:border-b-0 hover:bg-[var(--bg-soft)]/60">
                      <td className="whitespace-nowrap px-5 py-4 text-muted">
                        {new Date(row.createdAt).toLocaleString("ru-RU")}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap font-medium">{row.adminName}</td>
                      <td className="px-5 py-4">
                        <div className="max-w-[620px] whitespace-pre-line break-words leading-6">
                          {row.changes}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="max-w-[420px] whitespace-pre-line break-words leading-6 text-muted">
                          {row.comment}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-5 text-sm text-muted">Пока нет истории финконтроля.</div>
            )}
          </div>
        </section>
      </div>

      <Modal
        open={commentOpen}
        onClose={() => {
          setCommentOpen(false);
          setCommentError(null);
          setCommentDraft("");
        }}
        title="Комментарий к изменению"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-soft bg-[var(--bg-soft)] px-4 py-3 text-sm text-muted">
            Комментарий обязателен. Он попадёт в историю изменений и в audit-log.
          </div>

          <label className="block text-sm">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted">
              Причина изменения
            </span>
            <textarea
              className="ui-input min-h-32 w-full resize-y leading-6"
              value={commentDraft}
              onChange={(e) => {
                setCommentDraft(e.target.value);
                if (commentError) setCommentError(null);
              }}
              placeholder={COMMENT_PROMPT}
            />
          </label>

          {commentError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
              {commentError}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <button
              className="btn h-10"
              onClick={() => {
                setCommentOpen(false);
                setCommentError(null);
                setCommentDraft("");
              }}
            >
              Отмена
            </button>
            <button
              className="btn btn-primary h-10"
              onClick={async () => {
                if (!commentDraft.trim()) {
                  setCommentError(COMMENT_REQUIRED_MESSAGE);
                  return;
                }
                await saveChanges(commentDraft);
              }}
            >
              Сохранить
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
