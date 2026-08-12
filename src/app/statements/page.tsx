"use client";

import { useEffect, useMemo, useState } from "react";
import { getTransactions } from "@/lib/api";
import { exportRows } from "@/lib/exporters";
import { exportAccountStatement, AccountStatementEntry } from "@/lib/accountStatement";
import { readableRejectionReason } from "@/lib/rejectionReason";
import { Transaction } from "@/types";
import Modal from "@/components/Modal";

const ASSET_OPTIONS = [
  { label: "СОМ", value: "SOM" },
  { label: "Салам", value: "SALAM" },
  { label: "USDT TRC20", value: "USDT" },
] as const;

const EXPORT_PAGE_SIZE = 200;

function asNumber(value: number | undefined): number {
  return Number(value ?? 0);
}

function txLabel(t: Transaction) {
  return t.kind ? `${t.kind} · ${t.id}` : t.id;
}

async function fetchAllByRole(params: {
  search: string;
  asset: string;
  role: "sender" | "receiver";
  dateFrom?: string;
  dateTo?: string;
}): Promise<Transaction[]> {
  const items: Transaction[] = [];
  let offset = 0;

  while (true) {
    const res = await getTransactions({
      [params.role]: params.search,
      offset,
      limit: EXPORT_PAGE_SIZE,
      sortBy: "createdAt",
      sortDir: "desc",
      currencies: [params.asset],
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    } as any);

    items.push(...res.items);
    if (res.items.length < EXPORT_PAGE_SIZE) break;
    offset += EXPORT_PAGE_SIZE;
    if (offset > 5000) break;
  }

  return items;
}

export default function StatementsPage() {
  const [fioSearch, setFioSearch] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [walletSearch, setWalletSearch] = useState("");
  const [asset, setAsset] = useState<string>("SALAM");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<
    "all-pdf" | "all-csv" | "all-txt" | "selected-pdf" | "selected-csv" | "selected-txt" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Transaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [autoLoaded, setAutoLoaded] = useState(false);
  const [hasPrefill, setHasPrefill] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const [statementExporting, setStatementExporting] = useState(false);
  const [statementOwner, setStatementOwner] = useState("");
  const [statementAccount, setStatementAccount] = useState("");
  const [statementDateFrom, setStatementDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().slice(0, 10);
  });
  const [statementDateTo, setStatementDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [statementClosingBalance, setStatementClosingBalance] = useState("0");
  const [statementError, setStatementError] = useState<string | null>(null);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds],
  );

  const searchSummary = useMemo(() => {
    const parts = [
      fioSearch.trim() ? `ФИО: ${fioSearch.trim()}` : "",
      phoneSearch.trim() ? `Телефон: ${phoneSearch.trim()}` : "",
      walletSearch.trim() ? `Кошелёк: ${walletSearch.trim()}` : "",
    ].filter(Boolean);

    return parts.length ? parts.join(" · ") : "Без фильтра";
  }, [fioSearch, phoneSearch, walletSearch]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [items]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fio = params.get("fio") || "";
    const phone = params.get("phone") || "";
    const wallet = params.get("wallet") || "";
    const nextAsset = params.get("asset") || "SALAM";

    setFioSearch(fio);
    setPhoneSearch(phone);
    setWalletSearch(wallet);
    setAsset(nextAsset);
    setHasPrefill(Boolean(fio || phone || wallet));
    setAutoLoaded(false);
  }, []);

  async function load() {
    const terms = [fioSearch.trim(), phoneSearch.trim(), walletSearch.trim()].filter(Boolean);
    if (!terms.length) {
      setError("Сначала укажите хотя бы одно поле: ФИО, телефон или кошелёк");
      setItems([]);
      setSelectedIds(new Set());
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const uniq = new Map<string, Transaction>();

      for (const term of terms) {
        const [sent, received] = await Promise.all([
          fetchAllByRole({ search: term, asset, role: "sender" }),
          fetchAllByRole({ search: term, asset, role: "receiver" }),
        ]);

        for (const tx of [...sent, ...received]) uniq.set(tx.id, tx);
      }

      const sorted = Array.from(uniq.values()).sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      );

      setItems(sorted);
      setSelectedIds(new Set());
      if (!sorted.length) {
        setError("По таким параметрам ничего не найдено");
      }
    } catch {
      setError("Не удалось загрузить выписку");
      setItems([]);
      setSelectedIds(new Set());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!hasPrefill || autoLoaded) return;
    if (!fioSearch.trim() && !phoneSearch.trim() && !walletSearch.trim()) return;
    void load().finally(() => setAutoLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fioSearch, phoneSearch, walletSearch, asset, hasPrefill]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((prev) => {
      if (items.length && prev.size === items.length) return new Set();
      return new Set(items.map((item) => item.id));
    });
  }

  async function exportTransactions(
    rows: Transaction[],
    format: "pdf" | "csv" | "txt",
    fileBaseName: string,
  ) {
    if (!rows.length) return;

    await exportRows({
      format,
      fileBaseName,
      title: "Выписка по операциям",
      periodLabel: `Выборка: ${searchSummary} · ${asset}`,
      columns: [
        { header: "Дата", getValue: (row) => new Date(row.createdAt).toLocaleString() },
        { header: "Tx / ID", getValue: (row) => row.id },
        { header: "Статус", getValue: (row) => row.status },
        { header: "Валюта", getValue: (row) => row.currency },
        { header: "Сумма", getValue: (row) => row.amount },
        { header: "Комиссия банка", getValue: (row) => row.feeAmount ?? 0 },
        {
          header: "Сетевая комиссия",
          getValue: (row) => `${asNumber(row.networkFeeAmount)} ${row.networkFeeAsset || ""}`.trim(),
        },
        { header: "Газ (energy)", getValue: (row) => asNumber(row.energyUsed) },
        { header: "Двигающая сила", getValue: (row) => asNumber(row.bandwidthUsed) },
        { header: "Сожжено BRICS", getValue: (row) => asNumber(row.bricsBurnedAmount) },
        { header: "Отправитель", getValue: (row) => row.sender },
        { header: "Получатель", getValue: (row) => row.recipient },
        { header: "Причина отклонения", getValue: (row) => readableRejectionReason(row) },
      ],
      rows,
    });
  }

  async function exportAll(format: "pdf" | "csv" | "txt") {
    if (!items.length) return;
    setExporting(`all-${format}`);
    try {
      await exportTransactions(items, format, `statements_all_${asset}`);
    } finally {
      setExporting(null);
    }
  }

  async function exportSelected(format: "pdf" | "csv" | "txt") {
    if (!selectedItems.length) return;
    setExporting(`selected-${format}`);
    try {
      await exportTransactions(selectedItems, format, `statements_selected_${asset}`);
    } finally {
      setExporting(null);
    }
  }

  function openAccountStatement() {
    const owner = fioSearch.trim() || phoneSearch.trim();
    const account = walletSearch.trim();
    setStatementOwner(owner);
    setStatementAccount(account);
    setStatementError(null);
    setStatementOpen(true);
  }

  async function createAccountStatement() {
    const terms = [fioSearch.trim(), phoneSearch.trim(), walletSearch.trim()].filter(Boolean);
    if (!terms.length) {
      setStatementError("Сначала укажите пользователя в фильтрах выписки");
      return;
    }
    if (!statementOwner.trim() || !statementAccount.trim()) {
      setStatementError("Укажите владельца и номер счёта или кошелька");
      return;
    }
    if (!statementDateFrom || !statementDateTo || statementDateFrom > statementDateTo) {
      setStatementError("Проверьте период выписки");
      return;
    }

    setStatementExporting(true);
    setStatementError(null);
    try {
      const directions = new Map<string, { transaction: Transaction; outgoing: boolean }>();
      for (const term of terms) {
        const [sent, received] = await Promise.all([
          fetchAllByRole({
            search: term,
            asset,
            role: "sender",
            dateFrom: `${statementDateFrom}T00:00:00.000`,
            dateTo: `${statementDateTo}T23:59:59.999`,
          }),
          fetchAllByRole({
            search: term,
            asset,
            role: "receiver",
            dateFrom: `${statementDateFrom}T00:00:00.000`,
            dateTo: `${statementDateTo}T23:59:59.999`,
          }),
        ]);
        for (const transaction of received) {
          if (!directions.has(transaction.id)) directions.set(transaction.id, { transaction, outgoing: false });
        }
        for (const transaction of sent) directions.set(transaction.id, { transaction, outgoing: true });
      }

      const entries: AccountStatementEntry[] = Array.from(directions.values())
        .filter(({ transaction }) => transaction.status === "SUCCESS")
        .sort((a, b) => Date.parse(a.transaction.createdAt) - Date.parse(b.transaction.createdAt))
        .map(({ transaction, outgoing }) => {
          const amount = Number(transaction.amount || 0);
          const fee = Number(transaction.feeAmount || 0);
          return {
            date: new Date(transaction.createdAt).toLocaleDateString("ru-RU"),
            document: transaction.id,
            correspondent: outgoing ? transaction.recipient : transaction.sender,
            group: transaction.kind || "Операция",
            debit: outgoing ? amount + fee : 0,
            credit: outgoing ? 0 : amount,
            purpose:
              transaction.comment ||
              `${outgoing ? "Перевод получателю" : "Поступление от отправителя"} ${outgoing ? transaction.recipient : transaction.sender}`,
          };
        });

      const currency = ASSET_OPTIONS.find((option) => option.value === asset);
      await exportAccountStatement({
        ownerName: statementOwner.trim(),
        account: statementAccount.trim(),
        currencyLabel: currency?.label || asset,
        currencyCode: asset === "SOM" ? "417" : asset === "SALAM" ? "SALAM" : "USDT TRC20",
        dateFrom: new Date(`${statementDateFrom}T00:00:00`).toLocaleDateString("ru-RU"),
        dateTo: new Date(`${statementDateTo}T00:00:00`).toLocaleDateString("ru-RU"),
        closingBalance: Number(statementClosingBalance.replace(",", ".")) || 0,
        entries,
      });
      setStatementOpen(false);
    } catch {
      setStatementError("Не удалось сформировать выписку. Проверьте пользователя и период.");
    } finally {
      setStatementExporting(false);
    }
  }

  const hasAnySearch = Boolean(fioSearch.trim() || phoneSearch.trim() || walletSearch.trim());

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden pb-8 pr-1">
      <div className="card rounded-xl border border-soft p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.1fr_1.1fr_1.1fr_0.9fr_auto] md:items-end">
          <label className="grid gap-1">
            <div className="text-sm mb-1">ФИО</div>
            <input
              className="ui-input w-full"
              value={fioSearch}
              onChange={(e) => setFioSearch(e.target.value)}
              placeholder="Иван Иванов"
            />
          </label>

          <label className="grid gap-1">
            <div className="text-sm mb-1">Телефон</div>
            <input
              className="ui-input w-full"
              value={phoneSearch}
              onChange={(e) => setPhoneSearch(e.target.value)}
              placeholder="+996..."
            />
          </label>

          <label className="grid gap-1">
            <div className="text-sm mb-1">Кошелёк</div>
            <input
              className="ui-input w-full"
              value={walletSearch}
              onChange={(e) => setWalletSearch(e.target.value)}
              placeholder="TRVh3... / 0x..."
            />
          </label>

          <label className="grid gap-1">
            <div className="text-sm mb-1">Валюта</div>
            <select className="ui-input w-full" value={asset} onChange={(e) => setAsset(e.target.value)}>
              {ASSET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary h-10 px-5" onClick={load} disabled={loading}>
              {loading ? "Загрузка..." : "Показать выписку"}
            </button>
            <button className="btn h-10 whitespace-nowrap px-5" onClick={openAccountStatement}>
              Сделать выписку
            </button>
          </div>
        </div>

        <div className="mt-3 text-xs text-muted">Фильтр ищет только по ФИО, телефону и кошельку, затем объединяет найденные операции.</div>

        {error && <div className="mt-3 text-sm text-red-500">{error}</div>}
      </div>

      <div className="card flex min-h-[72vh] flex-[1.2] flex-col overflow-hidden rounded-xl border border-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-soft p-3 text-sm text-muted">
          <div>Операций: {items.length}</div>
          <div>Выбрано: {selectedItems.length}</div>
          <div>{searchSummary}</div>
          <div className="flex flex-wrap gap-2">
            <button className="btn h-9 px-3" onClick={toggleAllVisible} disabled={!items.length}>
              {selectedIds.size === items.length && items.length ? "Снять все" : "Выбрать все"}
            </button>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn h-9 px-3"
                onClick={() => exportAll("pdf")}
                disabled={!items.length || exporting !== null}
              >
                {exporting === "all-pdf" ? "PDF..." : "Экспорт всего PDF"}
              </button>
              <button
                className="btn h-9 px-3"
                onClick={() => exportAll("csv")}
                disabled={!items.length || exporting !== null}
              >
                {exporting === "all-csv" ? "CSV..." : "Экспорт всего CSV"}
              </button>
              <button
                className="btn h-9 px-3"
                onClick={() => exportAll("txt")}
                disabled={!items.length || exporting !== null}
              >
                {exporting === "all-txt" ? "TXT..." : "Экспорт всего TXT"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn h-9 px-3"
                onClick={() => exportSelected("pdf")}
                disabled={!selectedItems.length || exporting !== null}
              >
                {exporting === "selected-pdf" ? "PDF..." : "Экспорт выбранных PDF"}
              </button>
              <button
                className="btn h-9 px-3"
                onClick={() => exportSelected("csv")}
                disabled={!selectedItems.length || exporting !== null}
              >
                {exporting === "selected-csv" ? "CSV..." : "Экспорт выбранных CSV"}
              </button>
              <button
                className="btn h-9 px-3"
                onClick={() => exportSelected("txt")}
                disabled={!selectedItems.length || exporting !== null}
              >
                {exporting === "selected-txt" ? "TXT..." : "Экспорт выбранных TXT"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto pb-10">
          <table className="min-w-[2600px] w-full table-fixed text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--card)]">
              <tr className="border-b border-soft">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedIds.size === items.length}
                    onChange={toggleAllVisible}
                  />
                </th>
                <th className="w-40 px-4 py-3 text-left">Дата</th>
                <th className="w-64 px-4 py-3 text-left">Tx / ID</th>
                <th className="w-28 px-4 py-3 text-left">Статус</th>
                <th className="w-28 px-4 py-3 text-left">Валюта</th>
                <th className="w-28 px-4 py-3 text-right">Сумма</th>
                <th className="w-36 px-4 py-3 text-right">Комиссия банка</th>
                <th className="w-36 px-4 py-3 text-right">Сетевая комиссия</th>
                <th className="w-28 px-4 py-3 text-right">Газ (energy)</th>
                <th className="w-32 px-4 py-3 text-right">Двигающая сила</th>
                <th className="w-32 px-4 py-3 text-right">Сожжено BRICS</th>
                <th className="w-60 px-4 py-3 text-left">Отправитель</th>
                <th className="w-60 px-4 py-3 text-left">Получатель</th>
                <th className="w-72 px-4 py-3 text-left">Причина отклонения</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => {
                const rejectionReason = readableRejectionReason(t);
                return (
                  <tr key={t.id} className="border-b border-soft">
                    <td className="px-4 py-3 align-top">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(t.id)}
                        onChange={() => toggleSelected(t.id)}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 break-all">{txLabel(t)}</td>
                    <td className="px-4 py-3">{t.status}</td>
                    <td className="px-4 py-3">{t.currency}</td>
                    <td className="px-4 py-3 text-right">{t.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{Number(t.feeAmount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      {`${asNumber(t.networkFeeAmount).toLocaleString()} ${t.networkFeeAsset || ""}`.trim()}
                    </td>
                    <td className="px-4 py-3 text-right">{asNumber(t.energyUsed).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{asNumber(t.bandwidthUsed).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{asNumber(t.bricsBurnedAmount).toLocaleString()}</td>
                    <td className="px-4 py-3 break-words">{t.sender}</td>
                    <td className="px-4 py-3 break-words">{t.recipient}</td>
                    <td className="px-4 py-3 break-words">{rejectionReason}</td>
                  </tr>
                );
              })}
              {!loading && !hasAnySearch && items.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-muted" colSpan={15}>
                    Сначала укажите фильтры и нажмите «Показать выписку»
                  </td>
                </tr>
              )}
              {!loading && hasAnySearch && items.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-muted" colSpan={15}>
                    По таким параметрам ничего не найдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={statementOpen} onClose={() => setStatementOpen(false)} title="Сделать выписку по счёту">
        <div className="grid gap-4">
          <div className="rounded-lg border border-soft bg-[var(--background)] p-3 text-sm text-muted">
            Будет сформирован файл Excel в банковском формате: реквизиты счёта, входящий остаток, дебет, кредит, обороты и исходящий остаток.
          </div>
          <label className="grid gap-1">
            <span className="text-sm">Владелец счёта</span>
            <input className="ui-input" value={statementOwner} onChange={(event) => setStatementOwner(event.target.value)} placeholder="Фамилия Имя Отчество" />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Номер счёта или кошелька</span>
            <input className="ui-input" value={statementAccount} onChange={(event) => setStatementAccount(event.target.value)} placeholder="1340... / 0x... / TR..." />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-sm">Дата начала</span>
              <input className="ui-input" type="date" value={statementDateFrom} onChange={(event) => setStatementDateFrom(event.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Дата окончания</span>
              <input className="ui-input" type="date" value={statementDateTo} onChange={(event) => setStatementDateTo(event.target.value)} />
            </label>
          </div>
          <label className="grid gap-1">
            <span className="text-sm">Исходящий остаток на конец периода, {ASSET_OPTIONS.find((option) => option.value === asset)?.label}</span>
            <input className="ui-input" inputMode="decimal" value={statementClosingBalance} onChange={(event) => setStatementClosingBalance(event.target.value)} placeholder="0,00" />
            <span className="text-xs text-muted">Нужен для точного расчёта входящего остатка по операциям периода.</span>
          </label>
          {statementError && <div className="text-sm text-red-500">{statementError}</div>}
          <div className="flex justify-end gap-2 border-t border-soft pt-4">
            <button className="btn h-10 px-4" onClick={() => setStatementOpen(false)} disabled={statementExporting}>Отмена</button>
            <button className="btn btn-primary h-10 px-5" onClick={() => void createAccountStatement()} disabled={statementExporting}>
              {statementExporting ? "Формирование..." : "Скачать XLSX"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

