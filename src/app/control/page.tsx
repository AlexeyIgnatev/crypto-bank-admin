"use client";
import { useMemo, useState, useEffect } from "react";
import Modal from "@/components/Modal";

// Экран подключен к API /antifraud/rules для чтения/сохранения правил.

type Category = "Обязательный контроль" | "Поведение клиента";

type RuleBase = { id: string; category: Category; condition: string };

type RuleParams =
  | ({ type: "fiatOpsThreshold"; amountSom: number })
  | ({ type: "singleDeal"; amountSom: number })
  | ({ type: "frequentOps"; count: number; days: number; perOpMinSom: number })
  | ({ type: "withdrawAfterLargeIncome"; percent: number; baseAmountSom: number; days: number })
  | ({ type: "splitFiatAmounts"; amountSom: number; days: number })
  | ({ type: "thirdPartyDeposits"; count: number; days: number; totalSom: number })
  | ({ type: "accountActivityAfterInactivity"; months: number })
  | ({ type: "manyTransfersFromDifferentPersons"; persons: number });

import { getAntifraudRules, updateAntifraudRule, type AntiFraudRule } from "@/lib/api";

function ApiRulesManager() {
  const [rules, setRules] = useState<AntiFraudRule[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await getAntifraudRules();
        setRules(list);
      } catch (e) {
        setError("Не удалось загрузить правила");
      }
    })();
  }, []);

  async function toggleEnabled(rule: AntiFraudRule) {
    setSaving(rule.key);
    try {
      const next = await updateAntifraudRule(rule.key, { enabled: !rule.enabled });
      setRules(prev => (prev || []).map(r => r.key === rule.key ? next : r));
    } catch {
      setError("Не удалось обновить правило");
    } finally {
      setSaving(null);
    }
  }

  if (error) return <div className="p-3 text-sm text-red-500">{error}</div>;
  if (!rules) return <div className="p-3 text-sm text-muted">Загрузка правил…</div>;

  return (
    <section className="card rounded-xl border border-soft shadow-sm overflow-hidden">
      <header className="p-4 border-b border-soft flex items-center justify-between">
        <div className="text-lg font-semibold">Правила антифрода (API)</div>
      </header>
      <div className="p-2 divide-y divide-soft">
        {rules.map(r => (
          <div key={r.key} className="flex items-center justify-between gap-3 p-2">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{r.key}</div>
              <div className="text-xs text-muted truncate">обновлено: {new Date(r.updatedAt).toLocaleString()}</div>
            </div>
            <button className="btn h-8" disabled={saving===r.key} onClick={() => toggleEnabled(r)}>
              {r.enabled ? "Отключить" : "Включить"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

type Rule = RuleBase & { params: RuleParams };

type EditState = { open: boolean; rule: Rule | null };

export default function ControlPage() {
  const [rules, setRules] = useState<Rule[]>(() => initialRules());
  // подтягиваем значения из бекенда в текущую вёрстку
  useEffect(() => {
    (async () => {
      try {
        const list = await getAntifraudRules();
        setRules(prev => applyFromBackend(list, prev));
      } catch {}
    })();
  }, []);

  const [edit, setEdit] = useState<EditState>({ open: false, rule: null });

  const groups = useMemo(() => ({
    required: rules.filter(r => r.category === "Обязательный контроль"),
    behavior: rules.filter(r => r.category === "Поведение клиента"),
  }), [rules]);

  const openEdit = (rule: Rule) => setEdit({ open: true, rule: clone(rule) });
  const closeEdit = () => setEdit({ open: false, rule: null });

  const KEY_MAP: Record<string, string> = {
    "req-1": "FIAT_ANY_GE_1M",
    "req-2": "ONE_TIME_GE_8M",
    "beh-1": "FREQUENT_OPS_3_30D_EACH_GE_100K",
    "beh-2": "WITHDRAW_AFTER_LARGE_INFLOW",
    "beh-3": "SPLITTING_TOTAL_14D_GE_1M",
    "beh-4": "THIRD_PARTY_DEPOSITS_3_30D_TOTAL_GE_1M",
    "beh-5": "AFTER_INACTIVITY_6M",
    "beh-6": "MANY_SENDERS_TO_ONE_10_PER_MONTH",
  };
  function toDto(rule: Rule): any {
    const t = rule.params;
    switch (t.type) {
      case "fiatOpsThreshold":
        return { threshold_som: String(t.amountSom) };
      case "singleDeal":
        return { threshold_som: String(t.amountSom) };
      case "frequentOps":
        return { min_count: t.count, period_days: t.days, threshold_som: String(t.perOpMinSom) };
      case "withdrawAfterLargeIncome":
        return { percent_threshold: String(t.percent), threshold_som: String(t.baseAmountSom), period_days: t.days };
      case "splitFiatAmounts":
        return { threshold_som: String(t.amountSom), period_days: t.days };
      case "thirdPartyDeposits":
        return { min_count: t.count, period_days: t.days, threshold_som: String(t.totalSom) };
      case "accountActivityAfterInactivity":
        return { period_days: Math.max(1, Math.trunc(t.months * 30)) };
      case "manyTransfersFromDifferentPersons":
        return { min_count: t.persons, period_days: 30 };
    }
  }
  function applyFromBackend(list: AntiFraudRule[], prev: Rule[]): Rule[] {
    const byKey = Object.fromEntries(list.map(r => [r.key, r] as const));
    return prev.map(r => {
      const key = KEY_MAP[r.id];
      const br = byKey[key];
      if (!br) return r;
      const p = r.params as any;
      switch (p.type) {
        case "fiatOpsThreshold":
        case "singleDeal":
          p.amountSom = Number((br as any).threshold_som ?? p.amountSom) || p.amountSom; break;
        case "frequentOps":
          p.count = Number((br as any).min_count ?? p.count) || p.count;
          p.days = Number((br as any).period_days ?? p.days) || p.days;
          p.perOpMinSom = Number((br as any).threshold_som ?? p.perOpMinSom) || p.perOpMinSom; break;
        case "withdrawAfterLargeIncome":
          p.percent = Number((br as any).percent_threshold ?? p.percent) || p.percent;
          p.baseAmountSom = Number((br as any).threshold_som ?? p.baseAmountSom) || p.baseAmountSom;
          p.days = Number((br as any).period_days ?? p.days) || p.days; break;
        case "splitFiatAmounts":
          p.amountSom = Number((br as any).threshold_som ?? p.amountSom) || p.amountSom;
          p.days = Number((br as any).period_days ?? p.days) || p.days; break;
        case "thirdPartyDeposits":
          p.count = Number((br as any).min_count ?? p.count) || p.count;
          p.days = Number((br as any).period_days ?? p.days) || p.days;
          p.totalSom = Number((br as any).threshold_som ?? p.totalSom) || p.totalSom; break;
        case "accountActivityAfterInactivity":
          p.months = Math.max(1, Math.round(Number((br as any).period_days ?? p.months*30) / 30)); break;
        case "manyTransfersFromDifferentPersons":
          p.persons = Number((br as any).min_count ?? p.persons) || p.persons; break;
      }
      return { ...r, params: { ...p } } as Rule;
    });
  }

  const [saving, setSaving] = useState(false);
  const saveEdit = async () => {
    if (!edit.rule) return;
    setSaving(true);
    try {
      const key = KEY_MAP[edit.rule.id];
      const dto = toDto(edit.rule);
      await updateAntifraudRule(key, dto);
      setRules(prev => prev.map(r => r.id === edit.rule!.id ? edit.rule! : r));
    } finally {
      setSaving(false);
      closeEdit();
    }
  };

  return (
    <div className="flex-1 min-h-0 flex">
      <div className="m-auto w-full max-w-5xl">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title="Обязательный контроль">
            {groups.required.map(rule => (
              <RuleRow key={rule.id} label={rule.condition} value={formatSummary(rule.params)} onEdit={() => openEdit(rule)} />
            ))}
          </Section>
          <Section title="Поведение клиента">
            {groups.behavior.map(rule => (
              <RuleRow key={rule.id} label={rule.condition} value={formatSummary(rule.params)} onEdit={() => openEdit(rule)} />
            ))}
          </Section>
        </div>
      </div>

      <EditModal open={edit.open} rule={edit.rule} onChange={setEdit} onClose={closeEdit} onSave={saveEdit} saving={saving} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card rounded-xl border border-soft shadow-sm overflow-hidden">
      <header className="p-4 border-b border-soft flex items-center justify-between">
        <div className="text-lg font-semibold">{title}</div>
      </header>
      <div className="p-4 space-y-3">{children}</div>
    </section>
  );
}

function RuleRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-soft bg-[var(--card)]">
      <div className="min-w-0">
        <div className="text-sm font-medium truncate" title={label}>{label}</div>
        <div className="text-muted text-sm truncate" title={value}>{value}</div>
      </div>
      <button className="btn btn-edit whitespace-nowrap" onClick={onEdit}>✎ Изменить</button>
    </div>
  );
}

function EditModal({ open, rule, onChange, onClose, onSave, saving }: { open: boolean; rule: Rule | null; onChange: (s: EditState) => void; onClose: () => void; onSave: () => void; saving: boolean; }) {
  if (!open || !rule) return null;

  const setParams = (patch: Partial<RuleParams>) => {
    onChange({ open: true, rule: { ...rule, params: { ...(rule.params as any), ...patch } as RuleParams } });
  };

  const err = validate(rule.params);
  const disabled = !!err;

  return (
    <Modal open={open} onClose={onClose} title={`Изменить: ${rule.condition}`}>
      <div className="space-y-3">
        {rule.params.type === "fiatOpsThreshold" && (
          <NumberField label="Сумма, сом" value={rule.params.amountSom} onChange={(v) => setParams({ amountSom: v })} min={0} step="1000" />
        )}
        {rule.params.type === "singleDeal" && (
          <NumberField label="Сумма сделки, сом" value={rule.params.amountSom} onChange={(v) => setParams({ amountSom: v })} min={0} step="1000" />
        )}
        {rule.params.type === "frequentOps" && (
          <>
            <IntegerField label="Кол-во операций" value={rule.params.count} onChange={(v) => setParams({ count: v })} min={1} />
            <IntegerField label="Период, дней" value={rule.params.days} onChange={(v) => setParams({ days: v })} min={1} max={365} />
            <NumberField label="Мин. сумма одной операции, сом" value={rule.params.perOpMinSom} onChange={(v) => setParams({ perOpMinSom: v })} min={0} step="1000" />
          </>
        )}
        {rule.params.type === "withdrawAfterLargeIncome" && (
          <>
            <NumberField label="Процент от крупного поступления, %" value={rule.params.percent} onChange={(v) => setParams({ percent: v })} min={0} max={100} step="0.1" />
            <NumberField label="Крупное поступление от, сом" value={rule.params.baseAmountSom} onChange={(v) => setParams({ baseAmountSom: v })} min={0} step="1000" />
            <IntegerField label="Период после поступления, дней" value={rule.params.days} onChange={(v) => setParams({ days: v })} min={1} max={365} />
          </>
        )}
        {rule.params.type === "splitFiatAmounts" && (
          <>
            <NumberField label="Сумма изменений, сом" value={rule.params.amountSom} onChange={(v) => setParams({ amountSom: v })} min={0} step="1000" />
            <IntegerField label="Период, дней" value={rule.params.days} onChange={(v) => setParams({ days: v })} min={1} max={365} />
          </>
        )}
        {rule.params.type === "thirdPartyDeposits" && (
          <>
            <IntegerField label="Кол-во разных лиц" value={rule.params.count} onChange={(v) => setParams({ count: v })} min={1} />
            <IntegerField label="Период, дней" value={rule.params.days} onChange={(v) => setParams({ days: v })} min={1} max={365} />
            <NumberField label="Общая сумма, сом" value={rule.params.totalSom} onChange={(v) => setParams({ totalSom: v })} min={0} step="1000" />
          </>
        )}
        {rule.params.type === "accountActivityAfterInactivity" && (
          <IntegerField label="Неактивность, месяцев" value={rule.params.months} onChange={(v) => setParams({ months: v })} min={1} max={120} />
        )}
        {rule.params.type === "manyTransfersFromDifferentPersons" && (
          <IntegerField label="Кол-во физлиц за месяц" value={rule.params.persons} onChange={(v) => setParams({ persons: v })} min={1} />
        )}

        {err && <div className="text-sm text-red-500">{err}</div>}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button className="btn h-9" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary h-9" disabled={disabled || saving} onClick={onSave}>{saving?"Сохранение…":"Сохранить"}</button>
        </div>
      </div>
    </Modal>
  );
}

function NumberField({ label, value, onChange, min, max, step }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: string; }) {
  return (
    <label className="block text-sm">
      <span className="text-muted">{label}</span>
      <input className="ui-input w-full mt-1" type="number" inputMode="decimal" step={step || "0.01"} value={Number.isFinite(value) ? String(value) : ""} onChange={e => onChange(safeNum(e.target.value))} min={min as any} max={max as any} />
    </label>
  );
}
function IntegerField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; }) {
  return (
    <label className="block text-sm">
      <span className="text-muted">{label}</span>
      <input className="ui-input w-full mt-1" type="number" inputMode="numeric" step="1" value={Number.isFinite(value) ? String(value) : ""} onChange={e => onChange(Math.trunc(safeNum(e.target.value)))} min={min as any} max={max as any} />
    </label>
  );
}

function formatSummary(p: RuleParams): string {
  switch (p.type) {
    case "fiatOpsThreshold":
      return `Порог: ≥ ${fmt(p.amountSom)} сом`;
    case "singleDeal":
      return `Разовая сумма: ≥ ${fmt(p.amountSom)} сом`;
    case "frequentOps":
      return `≥ ${p.count} операций за ${p.days} дн.; каждая ≥ ${fmt(p.perOpMinSom)} сом`;
    case "withdrawAfterLargeIncome":
      return `Вывод ≥ ${fmt(p.percent)}% от поступления ≥ ${fmt(p.baseAmountSom)} сом в ${p.days} дн.`;
    case "splitFiatAmounts":
      return `Изменения баланса ≥ ${fmt(p.amountSom)} сом за ${p.days} дн.`;
    case "thirdPartyDeposits":
      return `≥ ${p.count} лиц за ${p.days} дн.; общая сумма ≥ ${fmt(p.totalSom)} сом`;
    case "accountActivityAfterInactivity":
      return `После неактивности ≥ ${p.months} мес.`;
    case "manyTransfersFromDifferentPersons":
      return `Переводы от ≥ ${p.persons} физлиц за месяц`;
  }
}

function validate(p: RuleParams): string | null {
  const gt0 = (n: number) => Number.isFinite(n) && n > 0;
  const ge0 = (n: number) => Number.isFinite(n) && n >= 0;
  switch (p.type) {
    case "fiatOpsThreshold":
    case "singleDeal":
      return ge0(p.amountSom) ? null : "Сумма должна быть ≥ 0";
    case "frequentOps":
      if (!gt0(p.count)) return "Кол-во операций должно быть > 0";
      if (!gt0(p.days)) return "Период в днях должен быть > 0";
      if (!ge0(p.perOpMinSom)) return "Мин. сумма операции должна быть ≥ 0";
      return null;
    case "withdrawAfterLargeIncome":
      if (!(p.percent >= 0 && p.percent <= 100)) return "Процент должен быть от 0 до 100";
      if (!ge0(p.baseAmountSom)) return "Крупное поступление должно быть ≥ 0";
      if (!gt0(p.days)) return "Период должен быть > 0";
      return null;
    case "splitFiatAmounts":
      if (!ge0(p.amountSom)) return "Сумма должна быть ≥ 0";
      if (!gt0(p.days)) return "Период должен быть > 0";
      return null;
    case "thirdPartyDeposits":
      if (!gt0(p.count)) return "Кол-во лиц должно быть > 0";
      if (!gt0(p.days)) return "Период должен быть > 0";
      if (!ge0(p.totalSom)) return "Сумма должна быть ≥ 0";
      return null;
    case "accountActivityAfterInactivity":
      return gt0(p.months) ? null : "Месяцы должны быть > 0";
    case "manyTransfersFromDifferentPersons":
      return gt0(p.persons) ? null : "Кол-во физлиц должно быть > 0";
  }
}

function fmt(x: number) { try { return Number(x).toLocaleString(); } catch { return String(x); } }
function safeNum(v: string): number { const x = Number(v.replace(/,/g, ".")); return Number.isFinite(x) ? x : 0; }
function clone<T>(x: T): T { return JSON.parse(JSON.stringify(x)); }

function initialRules(): Rule[] {
  return [
    { id: "req-1", category: "Обязательный контроль", condition: "(внесение, снятие, обмен) с фиата", params: { type: "fiatOpsThreshold", amountSom: 1_000_000 } },
    { id: "req-2", category: "Обязательный контроль", condition: "Разовая сделка", params: { type: "singleDeal", amountSom: 2_800_000 } },

    { id: "beh-1", category: "Поведение клиента", condition: "Частые внесения/снятия", params: { type: "frequentOps", count: 3, days: 30, perOpMinSom: 100_000 } },
    { id: "beh-2", category: "Поведение клиента", condition: "Вывод в фиат после крупного поступления", params: { type: "withdrawAfterLargeIncome", percent: 50, baseAmountSom: 1_000_000, days: 7 } },
    { id: "beh-3", category: "Поведение клиента", condition: "Дробление сумм перевода с фиата", params: { type: "splitFiatAmounts", amountSom: 1_000_000, days: 14 } },
    { id: "beh-4", category: "Поведение клиента", condition: "Внесение третьими лицами на кошелёк", params: { type: "thirdPartyDeposits", count: 3, days: 30, totalSom: 1_000_000 } },
    { id: "beh-5", category: "Поведение клиента", condition: "Активность счёта", params: { type: "accountActivityAfterInactivity", months: 6 } },
    { id: "beh-6", category: "Поведение клиента", condition: "Много переводов от разных физлиц на один счёт за месяц", params: { type: "manyTransfersFromDifferentPersons", persons: 10 } },
  ];
}
