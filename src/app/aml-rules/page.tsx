"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { getAdminActionLogs, getAdmins, type AdminActionLog } from "@/lib/api";
import { COMMENT_PROMPT, COMMENT_REQUIRED_MESSAGE } from "@/lib/commentPrompt";
import { exportRows, type ExportFormat } from "@/lib/exporters";

type ActiveSource = "api" | "urls" | "file";
type WalletRule = { address: string; reason: string };
type AmlSettings = {
  api: string;
  urls: string[];
  fileName: string;
  activeSources: ActiveSource[];
  fileRules: WalletRule[];
  blockedWallets: WalletRule[];
};

const EMPTY_SETTINGS: AmlSettings = {
  api: "",
  urls: [],
  fileName: "",
  activeSources: ["urls"],
  fileRules: [],
  blockedWallets: [],
};

const SOURCE_OPTIONS: Array<{
  key: ActiveSource;
  title: string;
  description: string;
}> = [
  { key: "api", title: "API", description: "Один API-адрес с AML-правилами" },
  { key: "urls", title: "URL", description: "Одна или несколько ссылок на JSON" },
  { key: "file", title: "Файл", description: "Локальный JSON-файл с правилами" },
];

function normalizeUrls(value: string): string[] {
  return [...new Set(value.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean))];
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ru-RU");
}

function parseRules(payload: unknown): WalletRule[] {
  const root = payload as Record<string, unknown> | null;
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray(root?.wallets)
      ? root.wallets
      : Array.isArray(root?.rules)
        ? root.rules
        : [];
  return raw
    .map((item) => {
      const value = item as Record<string, unknown>;
      return {
        address: String(value.address ?? value.wallet ?? value.wallet_address ?? "").trim(),
        reason: String(value.reason ?? value.description ?? value.comment ?? "").trim(),
      };
    })
    .filter((item) => item.address && item.reason);
}

function detailsBody(details: unknown): Record<string, unknown> {
  try {
    const parsed = typeof details === "string" ? JSON.parse(details) : details;
    const body = (parsed as Record<string, unknown>)?.body;
    return ((body && typeof body === "object" ? body : parsed) ?? {}) as Record<
      string,
      unknown
    >;
  } catch {
    return {};
  }
}

function historyChanges(item: AdminActionLog): string {
  const body = detailsBody(item.details);
  const blocked = (body.blockedWallets ?? body.blocked_wallets) as unknown;
  if (Array.isArray(blocked)) return `Загружено адресов: ${blocked.length}`;
  const sources = body.activeSources ?? body.active_sources;
  if (Array.isArray(sources)) return `Активные источники: ${sources.join(", ")}`;
  return "Настройки AML изменены";
}

function historyComment(item: AdminActionLog): string {
  const body = detailsBody(item.details);
  return String(body.comment ?? body.reason ?? "Комментарий не указан");
}

export default function AmlRulesPage() {
  const [settings, setSettings] = useState<AmlSettings>(EMPTY_SETTINGS);
  const [urlDraft, setUrlDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [history, setHistory] = useState<AdminActionLog[]>([]);
  const [adminNames, setAdminNames] = useState<Map<string, string>>(new Map());
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  async function loadSettings() {
    const res = await fetch("/api/antifraud/aml-settings", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Не удалось загрузить настройки AML");
    const next = { ...EMPTY_SETTINGS, ...data } as AmlSettings;
    setSettings(next);
    setUrlDraft(
      next.urls?.length
        ? next.urls.join("\n")
        : `${window.location.origin}/aml-test-rules.json`,
    );
  }

  async function loadHistory() {
    const [logs, admins] = await Promise.all([
      getAdminActionLogs({
        offset: 0,
        limit: 100,
        sortBy: "createdAt",
        sortDir: "desc",
        actionQuery: "aml-settings",
      }),
      getAdmins({ offset: 0, limit: 500 }),
    ]);
    setHistory(logs.items);
    setAdminNames(
      new Map(
        admins.items.map((admin) => [
          String(admin.id),
          [admin.lastName, admin.firstName].filter(Boolean).join(" ") ||
            admin.login ||
            `Админ #${admin.id}`,
        ]),
      ),
    );
  }

  useEffect(() => {
    void Promise.all([loadSettings(), loadHistory().catch(() => undefined)])
      .catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)))
      .finally(() => setLoading(false));
  }, []);

  function toggleSource(source: ActiveSource) {
    setSettings((current) => ({
      ...current,
      activeSources: current.activeSources.includes(source)
        ? current.activeSources.filter((item) => item !== source)
        : [...current.activeSources, source],
    }));
  }

  async function readFile(file?: File) {
    if (!file) {
      setSettings((current) => ({ ...current, fileName: "", fileRules: [] }));
      return;
    }
    try {
      const rules = parseRules(JSON.parse(await file.text()));
      if (!rules.length) throw new Error("В файле нет корректных AML-правил");
      setSettings((current) => ({
        ...current,
        fileName: file.name,
        fileRules: rules,
      }));
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось прочитать файл");
    }
  }

  async function save() {
    if (!comment.trim()) {
      setError(COMMENT_REQUIRED_MESSAGE);
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        api: settings.api.trim(),
        urls: normalizeUrls(urlDraft),
        fileName: settings.fileName,
        activeSources: settings.activeSources,
        fileRules: settings.fileRules,
        comment: comment.trim(),
      };
      const res = await fetch("/api/antifraud/aml-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = Array.isArray(data?.message)
          ? data.message.join("; ")
          : data?.message;
        throw new Error(message || "Не удалось сохранить AML");
      }
      const next = { ...EMPTY_SETTINGS, ...data } as AmlSettings;
      setSettings(next);
      setUrlDraft(next.urls.join("\n"));
      setSuccess(`AML сохранён. Заблокированных адресов: ${next.blockedWallets.length}`);
      setComment("");
      setCommentOpen(false);
      await loadHistory().catch(() => undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setSaving(false);
    }
  }

  const historyRows = useMemo(
    () =>
      history.map((item) => ({
        date: formatDate(item.createdAt),
        admin:
          adminNames.get(String(item.admin_id)) ||
          (item.admin_id ? `Админ #${item.admin_id}` : "Система"),
        changes: historyChanges(item),
        comment: historyComment(item),
      })),
    [adminNames, history],
  );

  async function exportHistory(format: "csv" | "pdf") {
    setExporting(format);
    try {
      await exportRows({
        format,
        fileBaseName: "aml_history",
        title: "История AML",
        columns: [
          { header: "Дата", getValue: (row) => row.date },
          { header: "Администратор", getValue: (row) => row.admin },
          { header: "Изменения", getValue: (row) => row.changes },
          { header: "Комментарий", getValue: (row) => row.comment },
        ],
        rows: historyRows,
      });
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto pb-10">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4">
        <section className="card rounded-3xl border border-soft p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">
                Проверка внешних кошельков
              </div>
              <h1 className="mt-2 text-2xl font-semibold">AML</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                Выберите источники, укажите API, URL или JSON-файл и сохраните.
                Списки загружаются при сохранении, поэтому перевод проверяется без задержки.
              </p>
            </div>
            <button
              className="btn btn-primary h-11"
              disabled={loading || saving}
              onClick={() => setCommentOpen(true)}
            >
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
          {error ? <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          {success ? <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div> : null}
        </section>

        <section className="card rounded-3xl border border-soft p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Тестовый AML-набор</h2>
              <p className="mt-1 text-sm text-muted">
                Откройте кошелёк, укажите внутренний USDT-адрес клиента банка и
                выполните перевод. После сохранения URL операция будет отклонена
                до отправки в блокчейн и появится в кейсах финконтроля.
              </p>
            </div>
            <a
              className="btn h-10"
              href="/aml-test-rules.json"
              target="_blank"
              rel="noreferrer"
            >
              Открыть JSON
            </a>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <a
              className="rounded-2xl border border-soft p-4 transition-colors hover:border-red-300 hover:bg-red-50/60"
              href="/tron-wallet2"
              target="_blank"
              rel="noreferrer"
            >
              <span className="text-sm font-semibold">Внешний кошелёк AML №1</span>
              <span className="mt-2 block font-mono text-xs text-muted">
                TEYMgT9qm4eGtidZFvgyHgWQ754MiXMNo5
              </span>
              <span className="mt-2 block text-xs text-red-600">
                Спонсорство терроризма
              </span>
            </a>
            <a
              className="rounded-2xl border border-soft p-4 transition-colors hover:border-red-300 hover:bg-red-50/60"
              href="/tron-wallet3"
              target="_blank"
              rel="noreferrer"
            >
              <span className="text-sm font-semibold">Внешний кошелёк AML №2</span>
              <span className="mt-2 block font-mono text-xs text-muted">
                TApidQ7qtmV1HfvnfCoK3vydmpTeE127bk
              </span>
              <span className="mt-2 block text-xs text-red-600">
                Санкционный список
              </span>
            </a>
          </div>
        </section>

        <section className="card rounded-3xl border border-soft p-5 shadow-sm">
          <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="rounded-2xl border border-soft bg-[var(--bg-soft)] p-4">
              <h2 className="font-semibold">Активные источники</h2>
              <div className="mt-4 space-y-3">
                {SOURCE_OPTIONS.map((source) => (
                  <label key={source.key} className="flex cursor-pointer gap-3 rounded-xl border border-soft bg-[var(--card)] p-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-red-600"
                      checked={settings.activeSources.includes(source.key)}
                      onChange={() => toggleSource(source.key)}
                    />
                    <span>
                      <span className="block text-sm font-medium">{source.title}</span>
                      <span className="mt-1 block text-xs text-muted">{source.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </aside>

            <div className="grid content-start gap-4">
              <label className="grid gap-2 text-sm">
                <span className="font-medium">API</span>
                <input
                  className="ui-input"
                  value={settings.api}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, api: event.target.value }))
                  }
                  placeholder="https://example.com/api/aml"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">URL-источники, каждый с новой строки</span>
                <textarea
                  className="ui-input min-h-36 resize-y font-mono text-sm"
                  value={urlDraft}
                  onChange={(event) => setUrlDraft(event.target.value)}
                  placeholder="http://192.168.255.121:46346/aml-test-rules.json"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">JSON-файл</span>
                <input className="ui-input" type="file" accept=".json,application/json" onChange={(event) => void readFile(event.target.files?.[0])} />
                <span className="text-xs text-muted">
                  {settings.fileName
                    ? `${settings.fileName}: ${settings.fileRules.length} адресов`
                    : "Файл не выбран"}
                </span>
              </label>
            </div>
          </div>
        </section>

        <section className="card overflow-hidden rounded-3xl border border-soft shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-soft px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold">Загруженные AML-адреса</h2>
              <p className="mt-1 text-sm text-muted">
                Эти адреса сейчас блокируются при переводе на внутренний кошелёк банка.
              </p>
            </div>
            <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700">
              {settings.blockedWallets.length}
            </span>
          </div>
          <div className="max-h-72 overflow-auto">
            {settings.blockedWallets.length ? (
              <table className="w-full min-w-[760px] text-sm">
                <thead className="sticky top-0 bg-[var(--card)] text-left text-muted">
                  <tr><th className="px-5 py-3">Кошелёк</th><th className="px-5 py-3">Причина</th></tr>
                </thead>
                <tbody>
                  {settings.blockedWallets.map((rule) => (
                    <tr key={rule.address} className="border-t border-soft">
                      <td className="px-5 py-3 font-mono">{rule.address}</td>
                      <td className="px-5 py-3">{rule.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-5 text-sm text-muted">Список пока пуст.</div>
            )}
          </div>
        </section>

        <section className="card overflow-hidden rounded-3xl border border-soft shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-soft px-5 py-4">
            <h2 className="text-lg font-semibold">История AML</h2>
            <div className="flex gap-1">
              <button className="btn h-9 px-3" disabled={!historyRows.length || !!exporting} onClick={() => void exportHistory("csv")}>CSV</button>
              <button className="btn h-9 px-3" disabled={!historyRows.length || !!exporting} onClick={() => void exportHistory("pdf")}>PDF</button>
            </div>
          </div>
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="sticky top-0 bg-[var(--card)] text-left text-muted">
                <tr><th className="px-5 py-3">Дата</th><th className="px-5 py-3">Администратор</th><th className="px-5 py-3">Изменения</th><th className="px-5 py-3">Комментарий</th></tr>
              </thead>
              <tbody>
                {historyRows.map((row, index) => (
                  <tr key={`${row.date}-${index}`} className="border-t border-soft">
                    <td className="whitespace-nowrap px-5 py-3">{row.date}</td>
                    <td className="px-5 py-3">{row.admin}</td>
                    <td className="px-5 py-3">{row.changes}</td>
                    <td className="px-5 py-3">{row.comment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <Modal open={commentOpen} onClose={() => setCommentOpen(false)} title="Комментарий к изменению AML">
        <div className="space-y-4">
          <label className="grid gap-2 text-sm">
            <span>Укажите приказ, по которому меняете AML</span>
            <textarea
              className="ui-input min-h-28 resize-y"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder={COMMENT_PROMPT}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setCommentOpen(false)}>Отмена</button>
            <button className="btn btn-primary" disabled={saving} onClick={() => void save()}>Сохранить</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
