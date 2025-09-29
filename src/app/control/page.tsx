"use client";
import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";

type Rule = {
  id: string;
  category: "Обязательный контроль" | "Поведение клиента";
  condition: string;
  threshold: string;
};

export default function ControlPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; id: string | null; title: string }>(() => ({ open: false, id: null, title: "" }));
  const [value, setValue] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/control", { cache: "no-store" });
        const j = await r.json();
        setRules(j.rules || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const groups = useMemo(() => {
    return {
      required: rules.filter(r => r.category === "Обязательный контроль"),
      behavior: rules.filter(r => r.category === "Поведение клиента"),
    };
  }, [rules]);

  const openEdit = (id: string, title: string, init: string) => {
    setModal({ open: true, id, title });
    setValue(init);
  };
  const closeEdit = () => setModal({ open: false, id: null, title: "" });
  const saveEdit = async () => {
    if (!modal.id) return;
    const next = value.trim();
    try {
      const r = await fetch("/api/control", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: modal.id, threshold: next }) });
      const j = await r.json();
      if (j && j.rule) {
        setRules(prev => prev.map(x => x.id === j.rule.id ? j.rule : x));
      }
    } catch {}
    closeEdit();
  };

  return (
    <div className="flex-1 min-h-0 flex">
      <div className="m-auto w-full max-w-5xl">
        <div className="text-xl font-semibold mb-4">Финансовый контроль</div>
        {loading ? (
          <div className="p-6 text-muted">Загрузка…</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="Обязательный контроль">
              {groups.required.map(rule => (
                <RuleRow key={rule.id} label={rule.condition} value={rule.threshold} onEdit={() => openEdit(rule.id, rule.condition, rule.threshold)} />
              ))}
            </Section>
            <Section title="Поведение клиента">
              {groups.behavior.map(rule => (
                <RuleRow key={rule.id} label={rule.condition} value={rule.threshold} onEdit={() => openEdit(rule.id, rule.condition, rule.threshold)} />
              ))}
            </Section>
          </div>
        )}
      </div>

      <EditModal open={modal.open} title={modal.title} value={value} onChange={setValue} onClose={closeEdit} onSave={saveEdit} />
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
        <div className="text-muted text-sm truncate" title={value}>Порог / Период / Количество: {value}</div>
      </div>
      <button className="btn btn-edit whitespace-nowrap" onClick={onEdit}>✎ Изменить</button>
    </div>
  );
}

function EditModal({ open, onClose, onSave, value, onChange, title }: { open: boolean; onClose: () => void; onSave: () => void; value: string; onChange: (v: string) => void; title: string; }) {
  return (
    <Modal open={open} onClose={onClose} title={`Изменить: ${title}`}>
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="text-muted">Порог / Период / Количество</span>
          <input className="ui-input w-full mt-1" value={value} onChange={e => onChange(e.target.value)} placeholder="Например: ≥ 3 операции за 30 дней…" />
        </label>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button className="btn h-9" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary h-9" onClick={onSave}>Сохранить</button>
        </div>
      </div>
    </Modal>
  );
}
