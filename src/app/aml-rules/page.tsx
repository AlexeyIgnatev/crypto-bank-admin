"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { getAdminActionLogs, getAdmins, type AdminActionLog } from "@/lib/api";
import { exportRows, type ExportFormat } from "@/lib/exporters";
import { COMMENT_PROMPT, COMMENT_REQUIRED_MESSAGE } from "@/lib/commentPrompt";

type ActiveSource = "api" | "urls" | "file";

type AdminOption = {
  id: string;
  label: string;
  login: string;
};

type AmlSettingsDraft = {
  api: string;
  urls: string;
  fileName: string;
  activeSources: ActiveSource[];
};

type AmlSettingsSnapshot = {
  api: string;
  urls: string[];
  fileName: string;
  activeSources: ActiveSource[];
};

type HistoryRow = {
  date: string;
  user: string;
  action: string;
  changed: string;
  comment: string;
  ip: string;
};

const SETTINGS_STORAGE_KEY = "aml-rules:settings:v2";
const LEGACY_STORAGE_KEY = "aml-rules:stubs:v1";

const ACTIVE_SOURCE_OPTIONS: Array<{
  key: ActiveSource;
  title: string;
  hint: string;
}> = [
  {
    key: "api",
    title: "API",
    hint: "Подключение к внешнему API-источнику",
  },
  {
    key: "urls",
    title: "URL-список",
    hint: "Список адресов для проверки",
  },
  {
    key: "file",
    title: "Файл",
    hint: "Загрузка файла с данными",
  },
];

const DEFAULT_ACTIVE_SOURCES: ActiveSource[] = ["api", "urls", "file"];

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

function parseJsonLike(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

function unwrapDetails(value: unknown): Record<string, unknown> | null {
  const parsed = parseJsonLike(value);
  if (!parsed || typeof parsed !== "object") return null;
  return parsed as Record<string, unknown>;
}

function unwrapBody(details: unknown): Record<string, unknown> | null {
  const parsed = unwrapDetails(details);
  if (!parsed) return null;
  const body = parsed.body ?? parsed.data ?? parsed.payload ?? parsed;
  if (!body || typeof body !== "object") return null;
  return body as Record<string, unknown>;
}

function findValueDeep(
  value: unknown,
  wantedKeys: string[],
  seen = new Set<unknown>(),
  depth = 0,
): unknown {
  if (value == null || depth > 6) return undefined;
  if (typeof value !== "object") return undefined;
  if (seen.has(value)) return undefined;
  seen.add(value);

  const wanted = new Set(wantedKeys.map((key) => key.toLowerCase()));

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findValueDeep(item, wantedKeys, seen, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  const obj = value as Record<string, unknown>;
  for (const [key, entry] of Object.entries(obj)) {
    if (wanted.has(key.toLowerCase()) && entry != null && toText(entry).trim()) {
      return entry;
    }
  }

  for (const entry of Object.values(obj)) {
    const found = findValueDeep(entry, wantedKeys, seen, depth + 1);
    if (found !== undefined) return found;
  }

  return undefined;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU");
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

function normalizeActiveSources(raw: unknown): ActiveSource[] {
  if (!Array.isArray(raw)) return DEFAULT_ACTIVE_SOURCES;
  const result = raw.filter(
    (item): item is ActiveSource =>
      item === "api" || item === "urls" || item === "file",
  );
  return result.length ? result : DEFAULT_ACTIVE_SOURCES;
}

function activeSourceLabel(source: ActiveSource): string {
  switch (source) {
    case "api":
      return "API";
    case "urls":
      return "URL-список";
    case "file":
      return "Файл";
  }
}

function activeSourceChipLabel(source: ActiveSource): string {
  switch (source) {
    case "api":
      return "API";
    case "urls":
      return "URL";
    case "file":
      return "Файл";
  }
}

function sourceSummary(activeSources: ActiveSource[]): string {
  return activeSources.map(activeSourceChipLabel).join(", ");
}

function buildHistorySummary(details: unknown): string {
  const body = unwrapBody(details);
  if (!body) return "—";

  const changesRaw = body.changes ?? body.diff ?? body.changedFields ?? body.changes_list;
  if (Array.isArray(changesRaw)) {
    const changes = changesRaw
      .map((entry) => toText(entry).trim())
      .filter(Boolean);
    return changes.length ? changes.join("\n") : "—";
  }

  if (changesRaw && typeof changesRaw === "object") {
    const entries = Object.entries(changesRaw as Record<string, unknown>)
      .map(([key, value]) => {
        if (!value || typeof value !== "object") return "";
        const typed = value as Record<string, unknown>;
        const before = toText(typed.before ?? typed.from).trim();
        const after = toText(typed.after ?? typed.to).trim();
        if (before === after) return "";
        return `${formatAmlFieldLabel(key as keyof AmlSettingsSnapshot)}: ${before || "—"} -> ${after || "—"}`;
      })
      .filter(Boolean);
    return entries.length ? entries.join("\n") : "—";
  }

  const beforeBody = unwrapDetails(body.before);
  const afterBody = unwrapDetails(body.after);
  if (beforeBody && afterBody) {
    const changes = buildAmlChanges(
      {
        api: toText(beforeBody.api),
        urls: Array.isArray(beforeBody.urls)
          ? beforeBody.urls.map((item) => toText(item).trim()).filter(Boolean)
          : normalizeSources(toText(beforeBody.urls)),
        fileName: toText(beforeBody.fileName),
        activeSources: normalizeActiveSources(beforeBody.activeSources),
      },
      {
        api: toText(afterBody.api),
        urls: Array.isArray(afterBody.urls)
          ? afterBody.urls.map((item) => toText(item).trim()).filter(Boolean)
          : normalizeSources(toText(afterBody.urls)),
        fileName: toText(afterBody.fileName),
        activeSources: normalizeActiveSources(afterBody.activeSources),
      },
    );
    return changes.length ? changes.join("\n") : "—";
  }

  return "—";
}

function extractComment(details: unknown): string {
  const body = unwrapBody(details) ?? unwrapDetails(details);
  if (!body) return "Комментарий не указан";

  const comment = findValueDeep(body, ["comment", "reason", "note", "message"]);
  const text = toText(comment).trim();
  return text || "Комментарий не указан";
}

function buildAmlSummary(settings: AmlSettingsDraft): string {
  const parts: string[] = [];
  const active = settings.activeSources.length
    ? sourceSummary(settings.activeSources)
    : "ничего";

  parts.push(`Активно: ${active}`);

  if (settings.api.trim()) {
    parts.push(`API: ${settings.api.trim().slice(0, 60)}`);
  }

  const urls = normalizeSources(settings.urls);
  if (urls.length) {
    parts.push(`URL: ${urls.length} шт.`);
  }

  if (settings.fileName.trim()) {
    parts.push(`Файл: ${settings.fileName.trim()}`);
  }

  return parts.join(" | ");
}

function loadStoredSettings(): AmlSettingsDraft | null {
  if (typeof window === "undefined") return null;

  const keys = [SETTINGS_STORAGE_KEY, LEGACY_STORAGE_KEY];
  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return {
        api: toText(parsed.api),
        urls: Array.isArray(parsed.urls)
          ? parsed.urls.map((item) => toText(item)).join("\n")
          : toText(parsed.urls),
        fileName: toText(parsed.fileName),
        activeSources: normalizeActiveSources(parsed.activeSources),
      };
    } catch {
      // Ignore malformed cache and fall through to defaults.
    }
  }

  return null;
}

function isSourceEnabled(
  activeSources: ActiveSource[],
  source: ActiveSource,
): boolean {
  return activeSources.includes(source);
}

function readSettingsSnapshot(settings: AmlSettingsDraft): AmlSettingsDraft {
  return {
    api: settings.api.trim(),
    urls: settings.urls,
    fileName: settings.fileName.trim(),
    activeSources: [...settings.activeSources],
  };
}

function readSettingsValue(settings: AmlSettingsDraft): AmlSettingsSnapshot {
  return {
    api: settings.api.trim(),
    urls: normalizeSources(settings.urls),
    fileName: settings.fileName.trim(),
    activeSources: [...settings.activeSources],
  };
}

function sameTextArray(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((item, index) => item === right[index]);
}

function formatAmlValue(value: string | string[]): string {
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "—";
  }
  const text = value.trim();
  return text || "—";
}

function formatAmlFieldLabel(field: keyof AmlSettingsSnapshot): string {
  switch (field) {
    case "api":
      return "API";
    case "urls":
      return "URL";
    case "fileName":
      return "Файл";
    case "activeSources":
      return "Активные источники";
  }
}

function buildAmlChanges(
  previous: AmlSettingsSnapshot,
  next: AmlSettingsSnapshot,
): string[] {
  const changes: string[] = [];

  if (previous.api !== next.api) {
    changes.push(
      `${formatAmlFieldLabel("api")}: ${formatAmlValue(previous.api)} -> ${formatAmlValue(next.api)}`,
    );
  }

  if (!sameTextArray(previous.urls, next.urls)) {
    changes.push(
      `${formatAmlFieldLabel("urls")}: ${formatAmlValue(previous.urls)} -> ${formatAmlValue(next.urls)}`,
    );
  }

  if (previous.fileName !== next.fileName) {
    changes.push(
      `${formatAmlFieldLabel("fileName")}: ${formatAmlValue(previous.fileName)} -> ${formatAmlValue(next.fileName)}`,
    );
  }

  const previousSources = [...previous.activeSources].sort().join(",");
  const nextSources = [...next.activeSources].sort().join(",");
  if (previousSources !== nextSources) {
    changes.push(
      `${formatAmlFieldLabel("activeSources")}: ${formatAmlValue(previous.activeSources.map(activeSourceChipLabel))} -> ${formatAmlValue(next.activeSources.map(activeSourceChipLabel))}`,
    );
  }

  return changes;
}

export default function AmlRulesPage() {
  const [apiDraft, setApiDraft] = useState("");
  const [urlDraft, setUrlDraft] = useState("");
  const [fileName, setFileName] = useState("");
  const [activeSources, setActiveSources] = useState<ActiveSource[]>(
    DEFAULT_ACTIVE_SOURCES,
  );
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
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
    const stored = loadStoredSettings();
    if (stored) {
      setApiDraft(stored.api);
      setUrlDraft(stored.urls);
      setFileName(stored.fileName);
      setActiveSources(stored.activeSources);
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
            [admin.lastName, admin.firstName].filter(Boolean).join(" ") ||
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
        actionQuery: "antifraud",
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

  const historyExportRows = useMemo<HistoryRow[]>(
    () =>
      history.map((item) => ({
        date: item.createdAt,
        user:
          adminLookup.get(String(item.admin_id)) ||
          (item.admin_id === 0 ? "Локально" : `Админ #${item.admin_id}`),
        action: item.action,
        changed: buildHistorySummary(item.details),
        comment: extractComment(item.details),
        ip: item.ip,
      })),
    [adminLookup, history],
  );

  async function saveSettings(comment: string) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    setCommentError(null);
    try {
      const commentText = comment.trim();
      if (!commentText) {
        throw new Error(COMMENT_REQUIRED_MESSAGE);
      }

      const previous = loadStoredSettings() ?? {
        api: "",
        urls: "",
        fileName: "",
        activeSources: DEFAULT_ACTIVE_SOURCES,
      };
      const draft = {
        api: apiDraft,
        urls: urlDraft,
        fileName,
        activeSources,
      };
      const snapshot = readSettingsSnapshot(draft);
      const changes = buildAmlChanges(
        readSettingsValue(previous),
        readSettingsValue(draft),
      );

      if (!snapshot.activeSources.length) {
        throw new Error("Выберите хотя бы один активный источник");
      }
      if (!changes.length) {
        throw new Error("Нет изменений для сохранения");
      }

      const payload = {
        api: snapshot.api,
        urls: normalizeSources(snapshot.urls),
        fileName: snapshot.fileName,
        activeSources: snapshot.activeSources,
      };

      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
      window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(payload));

      const synthetic: AdminActionLog = {
        id: Date.now(),
        admin_id: 0,
        ip: "local",
        action: "AML settings updated",
        details: JSON.stringify({
          body: {
            ...payload,
            comment: commentText,
            reason: commentText,
            changes,
          },
        }),
        createdAt: new Date().toISOString(),
      };

      setHistory((prev) => [synthetic, ...prev]);
      setSuccess("AML-настройки сохранены");
      setCommentDraft("");
      setCommentOpen(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось сохранить AML-настройки",
      );
      if (e instanceof Error && !e.message.trim()) {
        setCommentError(COMMENT_REQUIRED_MESSAGE);
      }
    } finally {
      setSaving(false);
    }
  }

  async function exportHistory(format: "csv" | "pdf") {
    if (!historyExportRows.length || historyExporting) return;
    setHistoryExporting(format);
    try {
      await exportRows({
        format,
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

  function toggleSource(source: ActiveSource) {
    setActiveSources((prev) =>
      prev.includes(source)
        ? prev.filter((item) => item !== source)
        : [...prev, source],
    );
  }

  const selectedSourceLabels = activeSources.map(activeSourceLabel);

  return (
    <div className="flex-1 min-h-0 overflow-auto pb-8">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4">
        <section className="card overflow-hidden rounded-3xl border border-soft shadow-sm">
          <div className="grid gap-4 border-b border-soft px-5 py-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-soft bg-[var(--bg-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  AML
                </span>
                <span className="inline-flex rounded-full border border-soft bg-[var(--bg-soft)] px-3 py-1 text-xs text-muted">
                  API, URL и файл
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-semibold">AML</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                Здесь выбираются активные источники AML и хранятся комментарии к изменениям.
                После сохранения новая запись сразу попадёт в историю ниже.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              <button
                className="btn btn-primary h-11 w-full lg:w-auto"
                disabled={saving}
                onClick={() => {
                  setCommentError(null);
                  setCommentOpen(true);
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

        <section className="card overflow-hidden rounded-3xl border border-soft shadow-sm">
          <div className="grid gap-4 border-b border-soft px-5 py-4">
            <div className="text-lg font-semibold">Настройки AML</div>
            <div className="text-sm text-muted">
              Слева можно отметить, какие источники сейчас активны. Справа находятся поля
              для их значений.
            </div>
          </div>

          <div className="grid gap-5 p-5 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="rounded-3xl border border-soft bg-[var(--bg-soft)] p-4">
              <div className="text-lg font-semibold">Активные источники</div>
              <p className="mt-2 text-sm leading-6 text-muted">
                Отметьте галочками то, что сейчас используется. Можно включить один источник
                или сразу несколько.
              </p>

              <div className="mt-4 space-y-3">
                {ACTIVE_SOURCE_OPTIONS.map((option) => (
                  <label
                    key={option.key}
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-soft bg-[var(--card)] px-4 py-3 transition-colors hover:border-[var(--accent)]/40"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)]"
                      checked={isSourceEnabled(activeSources, option.key)}
                      onChange={() => toggleSource(option.key)}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{option.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted">
                        {option.hint}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-soft bg-[var(--card)] px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-muted">
                  Сейчас активно
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedSourceLabels.length ? (
                    selectedSourceLabels.map((label) => (
                      <span
                        key={label}
                        className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
                      >
                        {label}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-muted">Ничего не выбрано</span>
                  )}
                </div>
              </div>
            </aside>

            <div className="grid gap-4">
              <label className="grid gap-1">
                <span className="text-xs text-muted">Вставить API</span>
                <input
                  className="ui-input"
                  value={apiDraft}
                  onChange={(e) => setApiDraft(e.target.value)}
                  placeholder="https://api.example.com/aml"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-muted">Вставить URL-ы</span>
                <textarea
                  className="ui-input min-h-40 resize-y leading-6"
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  placeholder={[
                    "https://example.com/aml-source-1",
                    "https://example.com/aml-source-2",
                  ].join("\n")}
                />
                <div className="text-xs text-muted">
                  {normalizeSources(urlDraft).length
                    ? `Всего URL: ${normalizeSources(urlDraft).length}`
                    : "Список URL пока пуст"}
                </div>
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-muted">Вставить файл</span>
                <input
                  className="ui-input"
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setFileName(file ? file.name : "");
                  }}
                />
                <div className="text-xs text-muted">
                  {fileName ? `Выбрано: ${fileName}` : "Файл пока не выбран"}
                </div>
              </label>
            </div>
          </div>
        </section>

        <section className="card overflow-hidden rounded-3xl border border-soft shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-soft px-5 py-4">
            <div>
              <div className="text-lg font-semibold">История AML</div>
              <div className="mt-1 text-sm text-muted">
                Показываются изменения, комментарии и кто именно вносил правки.
              </div>
            </div>
            <button
              className="btn h-10 px-3"
              type="button"
              onClick={() => exportHistory("csv")}
              disabled={!historyExportRows.length || Boolean(historyExporting)}
            >
              {historyExporting === "csv" ? "CSV..." : "CSV"}
            </button>
            <button
              className="btn h-10 px-3"
              type="button"
              onClick={() => exportHistory("pdf")}
              disabled={!historyExportRows.length || Boolean(historyExporting)}
            >
              {historyExporting === "pdf" ? "PDF..." : "PDF"}
            </button>
          </div>

          <div className="max-h-[620px] overflow-auto">
            {historyLoading ? (
              <div className="p-5 text-sm text-muted">Загрузка истории...</div>
            ) : historyError ? (
              <div className="p-5 text-sm text-red-600">{historyError}</div>
            ) : history.length ? (
              <table className="w-full min-w-[1080px] text-sm">
                <thead className="sticky top-0 z-[1] bg-[var(--card)] text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <tr className="border-b border-soft">
                    <th className="px-5 py-3">Дата</th>
                    <th className="px-5 py-3">Пользователь</th>
                    <th className="px-5 py-3">Что поменял</th>
                    <th className="px-5 py-3">Комментарий</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => {
                    const adminLabel =
                      adminLookup.get(String(item.admin_id)) ||
                      (item.admin_id === 0 ? "Локально" : `Админ #${item.admin_id}`);
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
                          <div className="max-w-[620px] whitespace-pre-wrap break-words text-sm leading-6">
                            {buildHistorySummary(item.details)}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="max-w-[420px] whitespace-pre-wrap break-words text-sm leading-6 text-muted">
                            {extractComment(item.details)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-5 text-sm text-muted">Пока нет истории AML.</div>
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
        title="Комментарий к изменению AML"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-soft bg-[var(--bg-soft)] px-4 py-3 text-sm text-muted">
            Комментарий обязателен и попадёт в историю изменений.
          </div>

          <label className="block text-sm">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted">
              На каком основании меняются настройки
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
              onClick={() => {
                if (!commentDraft.trim()) {
                  setCommentError(COMMENT_REQUIRED_MESSAGE);
                  return;
                }
                void saveSettings(commentDraft);
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
