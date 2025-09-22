"use client";
import Cards from "../components/Cards";
import Filters from "../components/Filters";
import Table from "../components/Table";
import Modal from "../components/Modal";
import { useMemo, useState } from "react";
import { applyFilters, generateTransactions } from "../lib/mockRepo";
import { Filters as FiltersType, Transaction } from "../types";

export default function Home() {
  const data = useMemo(() => generateTransactions(250), []);
  const [filters, setFilters] = useState<FiltersType>({ q: "", status: "all" });
  const filtered = useMemo(() => applyFilters(data, filters), [data, filters]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Transaction | null>(null);

  return (
    <div className="space-y-4">
      <Cards />
      <Filters value={filters} onChange={setFilters} />
      <Table
        data={filtered}
        onOpen={(t) => {
          setSelected(t);
          setOpen(true);
        }}
      />
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
      <div className="text-neutral-500">{label}</div>
      <div className={`col-span-2 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
