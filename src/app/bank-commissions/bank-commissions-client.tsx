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
  getAdminActionLogs,
  getAdmins,
  getAdminSettings,
  getBankCommissionBalances,
  putAdminSettings,
  type AdminActionLog,
} from "@/lib/api";
import { exportRows } from "@/lib/exporters";
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

type CommissionMode = "PERCENT" | "FIXED";

type CommissionSplit = {
  central: string;
  bank: string;
  partners: string;
};

type CommissionHistoryRow = {
  createdAt: string;
  adminId: number;
  adminName: string;
  comment: string;
  mode: CommissionMode;
  changes: string;
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
  bank_commission_central_bank_pct: "20",
  bank_commission_bank_pct: "40",
  bank_commission_partners_pct: "40",
  bank_commission_distribution_mode: "PERCENT",
  bank_commission_central_bank_fixed: "0",
  bank_commission_bank_fixed: "0",
  bank_commission_partners_fixed: "0",
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

function parsePercent(value: string): number {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseAmount(value: string): number {
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

function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getBankCommissionMode(value: string): CommissionMode {
  return value?.toUpperCase() === "FIXED" ? "FIXED" : "PERCENT";
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

function asText(value: unknown): string {
  return String(value ?? "").trim();
}

function diffLabel(label: string, current: unknown, previous: unknown): string | null {
  const next = asText(current);
  const prev = asText(previous);
  if (!next && !prev) return null;
  if (next === prev) return null;
  if (!prev) return `${label}: ${next}`;
  if (!next) return `${label}: ${prev} ? ?`;
  return `${label}: ${prev} ? ${next}`;
}

function buildBankCommissionChangeSummary(
  current: Record<string, any>,
  previous: Record<string, any> | null,
): string {
  const prev = previous || {};
  const parts = [
    diffLabel(
      "?????",
      current.bank_commission_distribution_mode ?? current.mode ?? current.distribution_mode,
      prev.bank_commission_distribution_mode ?? prev.mode ?? prev.distribution_mode,
    ),
    diffLabel("?? %", current.bank_commission_central_bank_pct, prev.bank_commission_central_bank_pct),
    diffLabel("???? %", current.bank_commission_bank_pct, prev.bank_commission_bank_pct),
    diffLabel("???????? %", current.bank_commission_partners_pct, prev.bank_commission_partners_pct),
    diffLabel("?? fixed", current.bank_commission_central_bank_fixed, prev.bank_commission_central_bank_fixed),
    diffLabel("???? fixed", current.bank_commission_bank_fixed, prev.bank_commission_bank_fixed),
    diffLabel("???????? fixed", current.bank_commission_partners_fixed, prev.bank_commission_partners_fixed),
    diffLabel(
      "????? ??????????",
      current.bank_fee_posting_time_bishkek,
      prev.bank_fee_posting_time_bishkek,
    ),
    diffLabel("???? ??? ??", current.central_bank_som_account, prev.central_bank_som_account),
    diffLabel("??????? SALAM ??", current.central_bank_salam_wallet, prev.central_bank_salam_wallet),
    diffLabel("??????? USDT ??", current.central_bank_usdt_wallet, prev.central_bank_usdt_wallet),
    diffLabel("???? ??? ?????", current.bank_som_account, prev.bank_som_account),
    diffLabel("??????? SALAM ?????", current.bank_salam_wallet, prev.bank_salam_wallet),
    diffLabel("??????? USDT ?????", current.bank_usdt_wallet, prev.bank_usdt_wallet),
    diffLabel("????????", current.bank_commission_partners_json, prev.bank_commission_partners_json),
  ].filter(Boolean);
  return parts.length ? parts.join(" | ") : "??? ?????????";
}

function extractBankCommissionHistory(
  logs: AdminActionLog[],
): CommissionHistoryRow[] {
  const ordered = [...logs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  let previousBody: Record<string, any> | null = null;

  const rows = ordered
    .map((log) => {
      const details = parseActionDetails(log.details);
      const body = (details?.body ?? details?.data ?? details) as Record<
        string,
        any
      > | null;
      if (!body || typeof body !== "object") return null;

      const comment = String(
        body.comment ?? body.reason ?? body.notes ?? body.message ?? "",
      ).trim();
      const mode = getBankCommissionMode(
        String(
          body.bank_commission_distribution_mode ??
            body.mode ??
            body.distribution_mode ??
            "PERCENT",
        ),
      );

      const changes = buildBankCommissionChangeSummary(body, previousBody);
      previousBody = body;

      if (changes === "??? ?????????" && !comment) return null;

      return {
        createdAt: log.createdAt,
        adminId: log.admin_id,
        comment,
        mode,
        changes,
      };
    })
    .filter((row): row is CommissionHistoryRow => Boolean(row))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  return rows;
}

function extractPartner(raw: string): PartnerForm {
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

function formatBalance(value: number | null, asset: string) {
  if (value == null) return "Баланс недоступен";
  const fractionDigits = asset === "SOM" ? 2 : 6;
  return `${value.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  })} ${asset}`;
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

function TimeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs text-muted">Время зачисления комиссий</span>
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
  mode,
  value,
  fixedValue,
  onModeChange,
  onCentralChange,
  onBankChange,
  onPartnersChange,
}: {
  mode: CommissionMode;
  value: CommissionSplit;
  fixedValue: CommissionSplit;
  onModeChange: (mode: CommissionMode) => void;
  onCentralChange: (value: string) => void;
  onBankChange: (value: string) => void;
  onPartnersChange: (value: string) => void;
}) {
  const chartValues = [
    {
      name: "ЦБ",
      value:
        mode === "FIXED"
          ? Math.max(0, parseAmount(fixedValue.central))
          : clampPercent(parsePercent(value.central)),
      color: "#2563eb",
    },
    {
      name: "Банк",
      value:
        mode === "FIXED"
          ? Math.max(0, parseAmount(fixedValue.bank))
          : clampPercent(parsePercent(value.bank)),
      color: "#f97316",
    },
    {
      name: "Партнеры",
      value:
        mode === "FIXED"
          ? Math.max(0, parseAmount(fixedValue.partners))
          : clampPercent(parsePercent(value.partners)),
      color: "#10b981",
    },
  ];

  return (
    <div className="grid items-start gap-3 rounded-2xl border border-soft bg-[var(--bg-soft)] p-4 xl:grid-cols-[240px_1fr]">
      <div className="grid gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            className={`btn h-9 px-3 ${mode === "PERCENT" ? "btn-primary" : ""}`}
            type="button"
            onClick={() => onModeChange("PERCENT")}
          >
            Проценты
          </button>
          <button
            className={`btn h-9 px-3 ${mode === "FIXED" ? "btn-primary" : ""}`}
            type="button"
            onClick={() => onModeChange("FIXED")}
          >
            Фикс. сумма
          </button>
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-muted">
            ЦБ, {mode === "FIXED" ? "сумма" : "%"}
          </span>
          <input
            className="ui-input"
            type="number"
            min="0"
            step="0.01"
            value={mode === "FIXED" ? fixedValue.central : value.central}
            onChange={(e) => onCentralChange(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-muted">
            Банк, {mode === "FIXED" ? "сумма" : "%"}
          </span>
          <input
            className="ui-input"
            type="number"
            min="0"
            step="0.01"
            value={mode === "FIXED" ? fixedValue.bank : value.bank}
            onChange={(e) => onBankChange(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-muted">
            Партнеры, {mode === "FIXED" ? "сумма" : "%"}
          </span>
          <input
            className="ui-input"
            type="number"
            min="0"
            step="0.01"
            value={mode === "FIXED" ? fixedValue.partners : value.partners}
            onChange={(e) => onPartnersChange(e.target.value)}
          />
        </div>
        <div className="text-xs text-muted">
          {mode === "FIXED"
            ? "Укажите фиксированные суммы для каждой части комиссии."
            : "Банк и партнеры всегда делят остаток комиссии 50/50."}
        </div>
      </div>

      <div className="grid gap-2 self-start">
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartValues}
                dataKey="value"
                nameKey="name"
                innerRadius={38}
                outerRadius={58}
                paddingAngle={2}
              >
                {chartValues.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip
                formatter={(val: number) => [
                  mode === "FIXED" ? formatAmount(val) : `${val}%`,
                  mode === "FIXED" ? "Сумма" : "Доля",
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid gap-2 text-sm text-muted sm:grid-cols-3">
          {chartValues.map((entry) => (
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
                {mode === "FIXED"
                  ? formatAmount(entry.value)
                  : `${entry.value.toFixed(2)}%`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HistoryPanel({
  rows,
  loading,
  onExportCsv,
}: {
  rows: CommissionHistoryRow[];
  loading: boolean;
  onExportCsv: () => Promise<void>;
}) {
  return (
    <SectionCard
      title="История изменений"
      subtitle="Изменения комиссионных процентов и фиксированных сумм из логов админки."
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted">
          {loading ? "Загрузка истории..." : `Записей: ${rows.length}`}
        </div>
        <button className="btn h-10 px-4" type="button" onClick={onExportCsv}>
          Скачать CSV
        </button>
      </div>
      <div className="mt-4 max-h-[420px] overflow-auto rounded-2xl border border-soft">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Дата</th>
              <th className="px-4 py-3">Админ</th>
              <th className="px-4 py-3">Режим</th>
              <th className="px-4 py-3">Изменения</th>
              <th className="px-4 py-3">Комментарий</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={`${row.createdAt}-${row.adminId}`} className="border-t border-soft">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.adminName}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {row.mode === "FIXED" ? "Фикс. сумма" : "Проценты"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-[620px] break-words text-muted">
                      {row.changes}
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-[320px] break-words text-muted">
                    {row.comment}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={5}>
                  История пока пустая.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function CommentModal({
  open,
  comment,
  onCommentChange,
  onClose,
  onConfirm,
  saving,
}: {
  open: boolean;
  comment: string;
  onCommentChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  saving: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl">
        <div className="text-lg font-semibold">Комментарий к сохранению</div>
        <div className="mt-1 text-sm text-muted">
          Укажите, почему меняются комиссии. Без комментария сохранить нельзя.
        </div>
        <textarea
          className="ui-input mt-4 min-h-[140px] w-full resize-none"
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder="Например: обновили комиссию для тестового сценария"
        />
        <div className="mt-4 flex justify-end gap-3">
          <button className="btn h-10 px-4" type="button" onClick={onClose}>
            Отмена
          </button>
          <button
            className="btn btn-primary h-10 px-4"
            type="button"
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BankCommissionsClient() {
  const [settings, setSettings] = useState<AdminSettings>(EMPTY_SETTINGS);
  const [initialSettings, setInitialSettings] = useState<AdminSettings | null>(null);
  const [balances, setBalances] =
    useState<BankCommissionBalances>(EMPTY_BALANCES);
  const [partner, setPartner] = useState<PartnerForm>(EMPTY_PARTNER);
  const [initialPartner, setInitialPartner] = useState<PartnerForm | null>(null);
  const [editingFields, setEditingFields] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshingBalances, setRefreshingBalances] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [historyRows, setHistoryRows] = useState<CommissionHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [adminNames, setAdminNames] = useState<Record<string, string>>({});
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveComment, setSaveComment] = useState("");
  const [saveCommentError, setSaveCommentError] = useState<string | null>(null);

  const partnerBalance = balances.partners[0] || null;
  const mode = getBankCommissionMode(settings.bank_commission_distribution_mode);

  const percentSplit: CommissionSplit = {
    central: settings.bank_commission_central_bank_pct,
    bank: settings.bank_commission_bank_pct,
    partners: settings.bank_commission_partners_pct,
  };
  const fixedSplit: CommissionSplit = {
    central: settings.bank_commission_central_bank_fixed,
    bank: settings.bank_commission_bank_fixed,
    partners: settings.bank_commission_partners_fixed,
  };
  const hasChanges = (() => {
    if (!initialSettings || !initialPartner) return false;
    const settingsChanged =
      settings.bank_fee_posting_time_bishkek.trim() !==
        initialSettings.bank_fee_posting_time_bishkek.trim() ||
      settings.central_bank_som_account.trim() !==
        initialSettings.central_bank_som_account.trim() ||
      settings.central_bank_salam_wallet.trim() !==
        initialSettings.central_bank_salam_wallet.trim() ||
      settings.central_bank_usdt_wallet.trim() !==
        initialSettings.central_bank_usdt_wallet.trim() ||
      settings.bank_commission_central_bank_pct.trim() !==
        initialSettings.bank_commission_central_bank_pct.trim() ||
      settings.bank_commission_bank_pct.trim() !==
        initialSettings.bank_commission_bank_pct.trim() ||
      settings.bank_commission_partners_pct.trim() !==
        initialSettings.bank_commission_partners_pct.trim() ||
      settings.bank_commission_distribution_mode.trim() !==
        initialSettings.bank_commission_distribution_mode.trim() ||
      settings.bank_commission_central_bank_fixed.trim() !==
        initialSettings.bank_commission_central_bank_fixed.trim() ||
      settings.bank_commission_bank_fixed.trim() !==
        initialSettings.bank_commission_bank_fixed.trim() ||
      settings.bank_commission_partners_fixed.trim() !==
        initialSettings.bank_commission_partners_fixed.trim() ||
      settings.bank_som_account.trim() !== initialSettings.bank_som_account.trim() ||
      settings.bank_salam_wallet.trim() !==
        initialSettings.bank_salam_wallet.trim() ||
      settings.bank_usdt_wallet.trim() !== initialSettings.bank_usdt_wallet.trim() ||
      settings.bank_commission_partners_json.trim() !==
        initialSettings.bank_commission_partners_json.trim();
    const partnerChanged =
      serializePartner(partner) !== serializePartner(initialPartner);
    return settingsChanged || partnerChanged;
  })();

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const [logs, adminsResult] = await Promise.all([
        getAdminActionLogs({
          actionQuery: "PUT /blockchain-config/admin-settings",
          limit: 200,
          sortBy: "createdAt",
          sortDir: "desc",
        }),
        getAdmins({ offset: 0, limit: 500, sortLastName: "asc", sortFirstName: "asc" }),
      ]);
      const adminMap: Record<string, string> = {};
      for (const admin of adminsResult.items) {
        const fullName = [admin.lastName, admin.firstName].filter(Boolean).join(" ").trim();
        adminMap[admin.id] = fullName || admin.login || `#${admin.id}`;
      }
      setAdminNames(adminMap);
      setHistoryRows(
        extractBankCommissionHistory(logs.items).map((row) => ({
          ...row,
          adminName: adminMap[String(row.adminId)] || `#${row.adminId}`,
        })),
      );
    } catch (err) {
      setError(getErrorMessage(err, "Не удалось загрузить историю изменений"));
    } finally {
      setHistoryLoading(false);
    }
  }

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
        setInitialSettings(settingsResult.value);
        setPartner(extractPartner(settingsResult.value.bank_commission_partners_json || "[]"));
        setInitialPartner(
          extractPartner(settingsResult.value.bank_commission_partners_json || "[]"),
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

    void loadHistory();

    return () => {
      alive = false;
    };
  }, []);

  function updateSetting<K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function updatePartner(patch: Partial<PartnerForm>) {
    setPartner((prev) => ({ ...prev, ...patch }));
  }

  function enableEditing(key: string) {
    setEditingFields((prev) => ({ ...prev, [key]: true }));
  }

  function isEditing(key: string) {
    return editingFields[key] === true;
  }

  function setCommissionSplitFromCentral(raw: string) {
    if (mode === "FIXED") {
      updateSetting("bank_commission_central_bank_fixed", raw);
      return;
    }
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
    if (mode === "FIXED") {
      updateSetting("bank_commission_bank_fixed", raw);
      return;
    }
    const shared = clampPercent(Math.min(parsePercent(raw), 50));
    const central = clampPercent(100 - shared * 2);
    setSettings((prev) => ({
      ...prev,
      bank_commission_central_bank_pct: formatPercent(central),
      bank_commission_bank_pct: formatPercent(shared),
      bank_commission_partners_pct: formatPercent(shared),
    }));
  }

  function setCommissionSplitFromPartners(raw: string) {
    if (mode === "FIXED") {
      updateSetting("bank_commission_partners_fixed", raw);
      return;
    }
    setCommissionSplitFromShared(raw);
  }

  function setCommissionMode(next: CommissionMode) {
    setSettings((prev) => ({
      ...prev,
      bank_commission_distribution_mode: next,
    }));
  }

  async function refreshBalances() {
    setRefreshingBalances(true);
    try {
      const data = await getBankCommissionBalances();
      setBalances(data);
    } catch (err) {
      setError(getErrorMessage(err, "Не удалось обновить балансы"));
    } finally {
      setRefreshingBalances(false);
    }
  }

  async function save(comment: string) {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: Partial<AdminSettings> & { comment: string } = {
        bank_fee_posting_time_bishkek: settings.bank_fee_posting_time_bishkek.trim(),
        central_bank_som_account: settings.central_bank_som_account.trim(),
        central_bank_salam_wallet: settings.central_bank_salam_wallet.trim(),
        central_bank_usdt_wallet: settings.central_bank_usdt_wallet.trim(),
        bank_commission_central_bank_pct:
          settings.bank_commission_central_bank_pct.trim(),
        bank_commission_bank_pct: settings.bank_commission_bank_pct.trim(),
        bank_commission_partners_pct: settings.bank_commission_partners_pct.trim(),
        bank_commission_distribution_mode:
          settings.bank_commission_distribution_mode.trim(),
        bank_commission_central_bank_fixed:
          settings.bank_commission_central_bank_fixed.trim(),
        bank_commission_bank_fixed: settings.bank_commission_bank_fixed.trim(),
        bank_commission_partners_fixed:
          settings.bank_commission_partners_fixed.trim(),
        bank_som_account: settings.bank_som_account.trim(),
        bank_salam_wallet: settings.bank_salam_wallet.trim(),
        bank_usdt_wallet: settings.bank_usdt_wallet.trim(),
        bank_commission_partners_json: serializePartner(partner),
        comment,
      };

      const saved = await putAdminSettings(payload);
      const [balanceData, logs] = await Promise.all([
        getBankCommissionBalances(),
        getAdminActionLogs({
          actionQuery: "PUT /blockchain-config/admin-settings",
          limit: 200,
          sortBy: "createdAt",
          sortDir: "desc",
        }),
      ]);
      setSettings((prev) => ({ ...prev, ...saved }));
      setBalances(balanceData);
      setPartner(extractPartner(saved.bank_commission_partners_json || "[]"));
      setInitialSettings(saved as AdminSettings);
      setInitialPartner(
        extractPartner(saved.bank_commission_partners_json || "[]"),
      );
      setHistoryRows(
        extractBankCommissionHistory(logs.items).map((row) => ({
          ...row,
          adminName: adminNames[String(row.adminId)] || `#${row.adminId}`,
        })),
      );
      setEditingFields({});
      setSuccess("Настройки комиссий банка сохранены");
    } catch (err) {
      setError(getErrorMessage(err, "Не удалось сохранить настройки комиссий банка"));
    } finally {
      setSaving(false);
    }
  }

  async function handleExportHistoryCsv() {
    await exportRows({
      format: "csv",
      fileBaseName: "bank-commission-history",
      title: "Bank commission changes",
      columns: [
        { header: "????", getValue: (row: CommissionHistoryRow) => formatDateTime(row.createdAt) },
        { header: "?????", getValue: (row: CommissionHistoryRow) => row.adminName },
        {
          header: "?????????",
          getValue: (row: CommissionHistoryRow) => row.changes,
        },
        { header: "???????????", getValue: (row: CommissionHistoryRow) => row.comment },
      ],
      rows: historyRows,
    });
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
    fieldKey: string;
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
      <CommentModal
        open={saveModalOpen}
        comment={saveComment}
        onCommentChange={(value) => {
          setSaveComment(value);
          if (saveCommentError) setSaveCommentError(null);
        }}
        onClose={() => {
          if (saving) return;
          setSaveModalOpen(false);
          setSaveComment("");
          setSaveCommentError(null);
        }}
        onConfirm={() => {
          const trimmed = saveComment.trim();
          if (!trimmed) {
            setSaveCommentError("Укажите комментарий");
            return;
          }
          setSaveCommentError(null);
          setSaveModalOpen(false);
          void save(trimmed);
        }}
        saving={saving}
      />

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-4">
        <section className="card rounded-2xl border border-soft px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-soft bg-[var(--bg-soft)] px-4 py-2 text-sm text-muted">
              Настройка реквизитов, режима распределения и живых остатков для начисления комиссий банка
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
            {saveCommentError ? (
              <div className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-600">
                {saveCommentError}
              </div>
            ) : null}
          </div>
        </section>

        <SectionCard
          title="Время зачисления"
          subtitle="Укажите время, по которому будут зачисляться комиссии."
        >
          <div className="grid items-start gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
            <TimeField
              value={settings.bank_fee_posting_time_bishkek}
              onChange={(value) =>
                updateSetting("bank_fee_posting_time_bishkek", value)
              }
            />
            <CommissionSplitPanel
              mode={mode}
              value={percentSplit}
              fixedValue={fixedSplit}
              onModeChange={setCommissionMode}
              onCentralChange={setCommissionSplitFromCentral}
              onBankChange={setCommissionSplitFromShared}
              onPartnersChange={setCommissionSplitFromPartners}
            />
          </div>
        </SectionCard>

        <GroupGrid
          title="Комиссии ЦБ"
          subtitle="Сначала вводятся реквизиты, после сохранения здесь же показываются живые балансы."
          fields={
            <>
              {renderManagedField({
                label: "Счет СОМ ЦБ",
                value: settings.central_bank_som_account,
                slot: balances.central_bank.som_account,
                fieldKey: "central_bank_som_account",
                onChange: (value) => updateSetting("central_bank_som_account", value),
                placeholder: "Введите номер счета",
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
                label: "Счет СОМ банка",
                value: settings.bank_som_account,
                slot: balances.bank.som_account,
                fieldKey: "bank_som_account",
                onChange: (value) => updateSetting("bank_som_account", value),
                placeholder: "Введите номер счета",
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
          title="Партнеры"
          subtitle="Здесь хранится один набор реквизитов партнера: счет СОМ, кошелёк SALAM и кошелёк USDT TRC20."
        >
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {renderManagedField({
              label: "Счет СОМ партнера",
              value: partner.som_account,
              slot: partnerBalance?.som_account || null,
              fieldKey: "partner_som_account",
              onChange: (value) => updatePartner({ som_account: value }),
              placeholder: "Введите номер счета",
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

        <HistoryPanel
          rows={historyRows}
          loading={historyLoading}
          onExportCsv={handleExportHistoryCsv}
        />

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button className="btn h-10 px-4" type="button" onClick={refreshBalances}>
            {refreshingBalances ? "Обновление..." : "Обновить балансы"}
          </button>
          <button
          className="btn btn-primary h-10 px-4"
          type="button"
          onClick={() => {
              if (!hasChanges) {
                void save("");
                return;
              }
              setSaveComment("");
              setSaveCommentError(null);
              setSaveModalOpen(true);
            }}
          disabled={saving}
        >
            Сохранить настройки
          </button>
        </div>
      </div>
    </div>
  );
}
