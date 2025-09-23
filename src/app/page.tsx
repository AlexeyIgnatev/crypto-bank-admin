"use client";
import Cards from "../components/Cards";
import FiltersBar from "../components/FiltersBar";
import Table from "../components/Table";
import Modal from "../components/Modal";
import { useMemo, useState } from "react";
import { applyFilters, generateTransactions } from "../lib/mockRepo";
import { Filters as FiltersType, Transaction } from "../types";

export default function Home() {
  const data = useMemo(() => generateTransactions(250), []);
  const [filters, setFilters] = useState<FiltersType>({ q: "", statuses: [] });
  const filtered = useMemo(() => applyFilters(data, filters), [data, filters]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Transaction | null>(null);

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
      <div className="shrink-0"><Cards /></div>
      <div className="shrink-0"><FiltersBar value={filters} onChange={setFilters} /></div>
      <div className="min-h-0 flex-1"><Table
        data={filtered}
        onOpen={(t) => { setSelected(t); setOpen(true); }}
      /></div>
      <Modal open={open} onClose={() => setOpen(false)} title="Детали транзакции">
        {selected && (
          <div className="space-y-2 text-sm text-fg">
            <Row label="ID/tx_hash" value={selected.id} mono />
            <Row label="Статус" value={selected.status} />
            <Row label="Дата" value={new Date(selected.createdAt).toLocaleString()} />
            <Row label="Сумма" value={`${selected.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${selected.currency}`} />
            <Row label="Отправитель" value={selected.sender} />
            <Row label="Получатель" value={selected.recipient} />
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="text-muted">{label}</div>
      <div className={`col-span-2 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
