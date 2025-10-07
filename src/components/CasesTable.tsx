"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/airbnb.css";
import { Russian } from "flatpickr/dist/l10n/ru.js";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AntiFraudCaseItem, AntiFraudCaseStatus, getAntifraudCases } from "@/lib/api";
import { formatAmount6 } from "@/lib/format";

export type SortKey = "createdAt" | "amount" | "status" | "id";
export type SortDir = "asc" | "desc";

function StatusBadge({ status }: { status: AntiFraudCaseStatus }) {
  const cls = status === "APPROVED" ? "badge-success" : status === "OPEN" ? "badge-warning" : "badge-danger";
  const text = status === "APPROVED" ? "Подтверждено" : status === "OPEN" ? "На рассмотрении" : "Отклонено";
  return <span className={`badge ${cls} whitespace-nowrap`}>{text}</span>;
}

function useDropdown() {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 260 });
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.max(240, Math.min(360, 260));
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      setPos({ top: r.bottom + 6, left, width });
    };
    update();
    const onScroll = () => update();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", update);
    const onDoc = (e: MouseEvent) => {
      if (!(e.target instanceof Node)) return;
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      const el = e.target as Element;
      if (el.closest && el.closest(".flatpickr-calendar")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", update);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);
  return { open, setOpen, btnRef, panelRef, pos };
}

export default function CasesTable({ onOpen, refreshToken = 0 }: { onOpen: (t: AntiFraudCaseItem) => void; refreshToken?: number; }) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<AntiFraudCaseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
  }, []);

  // ===== Фильтры =====
  const [idQuery, setIdQuery] = useState("");
  const [statusSet, setStatusSet] = useState<Set<AntiFraudCaseStatus>>(new Set());
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();
  const [minAmount, setMinAmount] = useState<number | undefined>();
  const [maxAmount, setMaxAmount] = useState<number | undefined>();
  const [currencySet, setCurrencySet] = useState<Set<string>>(new Set());
  const [senderQ, setSenderQ] = useState("");
  const [recipientQ, setRecipientQ] = useState("");

  const availableCurrencies = ["COM", "SALAM", "BTC", "ETH", "USDT"];

  // выпадающие меню
  const idDD = useDropdown();
  const statusDD = useDropdown();
  const dateDD = useDropdown();
  const amountDD = useDropdown();
  const currencyDD = useDropdown();
  const senderDD = useDropdown();
  const recipientDD = useDropdown();

  async function fetchPage(pageOffset: number, replace: boolean) {
    setLoading(true);
    try {
      const res = await getAntifraudCases({
        offset: pageOffset,
        limit,
        sortBy: sortKey === "id" ? "createdAt" : sortKey,
        sortDir,
        txHash: idQuery || undefined,
        id: idQuery || undefined,
        sender: senderQ || undefined,
        receiver: recipientQ || undefined,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount,
        caseStatuses: statusSet.size ? Array.from(statusSet) : undefined,
        currencies: currencySet.size ? Array.from(currencySet) : undefined,
      });
      setTotal(res.total ?? (res.items?.length || 0));
      setItems(prev => replace ? (res.items || []) : [...prev, ...(res.items || [])]);
    } catch {
      if (replace) { setItems([]); setTotal(0); }
    } finally {
      setLoading(false);
    }
  }

  // Первый запрос и обновления при изменении фильтров/сортировки/лимита/refreshToken
  useEffect(() => {
    setItems([]);
    setOffset(0);
    const el = containerRef.current; if (el) el.scrollTop = 0;
    fetchPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, sortKey, sortDir, idQuery, senderQ, recipientQ, dateFrom, dateTo, minAmount, maxAmount, statusSet, currencySet, refreshToken]);

  const canNext = offset + items.length < total;
  function loadMore() {
    if (loading || !canNext) return;
    const nextOffset = offset + items.length;
    setOffset(nextOffset);
    fetchPage(nextOffset, false);
  }

  const rowHeight = 48;
  const rowVirtualizer = useVirtualizer({
    count: items.length + (canNext ? 1 : 0),
    getScrollElement: () => containerRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
    initialRect: { width: 0, height: 600 },
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 200;
      if (nearEnd) loadMore();
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [canNext, loading, items.length]);

  function toggleSort(key: SortKey) {
    if (key === "id") return;
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-black/10 dark:border-white/10 overflow-hidden card shadow-sm mb-4">
      <div className="shrink-0 rounded-t-xl" style={{ background: "var(--primary)" }}>
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[72px]" />
            <col className="w-[240px]" />
            <col className="w-[140px]" />
            <col className="w-[180px]" />
            <col className="w-[160px]" />
            <col className="w-[120px]" />
            <col />
            <col />
          </colgroup>
          <thead className="text-white">
            <tr>
              <Th>№</Th>
              <Th onClick={() => toggleSort("id")} active={sortKey === "id"} dir={sortDir}>
                <div className="flex items-center gap-1">
                  <SortIcon active={sortKey === "id"} dir={sortDir} />
                  <span className="px-1">ID/tx_hash</span>
                  <button ref={idDD.btnRef as any} className="hdr-chip" aria-label="Фильтр" onClick={(e) => { e.stopPropagation(); idDD.setOpen(o => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
              <Th onClick={() => toggleSort("status")} active={sortKey === "status"} dir={sortDir}>
                <div className="flex items-center gap-1">
                  <SortIcon active={sortKey === "status"} dir={sortDir} />
                  <span className="px-1">Статус</span>
                  <button ref={statusDD.btnRef as any} className="hdr-chip" aria-label="Фильтр" onClick={(e) => { e.stopPropagation(); statusDD.setOpen(o => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
              <Th onClick={() => toggleSort("createdAt")} active={sortKey === "createdAt"} dir={sortDir}>
                <div className="flex items-center gap-1">
                  <SortIcon active={sortKey === "createdAt"} dir={sortDir} />
                  <span className="px-1">Дата</span>
                  <button ref={dateDD.btnRef as any} className="hdr-chip" aria-label="Фильтр" onClick={(e) => { e.stopPropagation(); dateDD.setOpen(o => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
              <Th onClick={() => toggleSort("amount")} active={sortKey === "amount"} dir={sortDir}>
                <div className="flex items-center gap-1">
                  <SortIcon active={sortKey === "amount"} dir={sortDir} />
                  <span className="px-1">Сумма</span>
                  <button ref={amountDD.btnRef as any} className="hdr-chip" aria-label="Фильтр" onClick={(e) => { e.stopPropagation(); amountDD.setOpen(o => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
              <Th>
                <div className="flex items-center gap-1">
                  <span className="px-1">Валюта</span>
                  <button ref={currencyDD.btnRef as any} className="hdr-chip" aria-label="Фильтр" onClick={(e) => { e.stopPropagation(); currencyDD.setOpen(o => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
              <Th>
                <div className="flex items-center gap-1">
                  <span className="px-1">Отправитель</span>
                  <button ref={senderDD.btnRef as any} className="hdr-chip" aria-label="Фильтр" onClick={(e) => { e.stopPropagation(); senderDD.setOpen(o => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
              <Th>
                <div className="flex items-center gap-1">
                  <span className="px-1">Получатель</span>
                  <button ref={recipientDD.btnRef as any} className="hdr-chip" aria-label="Фильтр" onClick={(e) => { e.stopPropagation(); recipientDD.setOpen(o => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
            </tr>
          </thead>
        </table>
      </div>

      {/* Тело таблицы с виртуализацией */}
      <div ref={containerRef} className="table-scroll flex-1 min-h-0 overflow-y-auto overflow-x-auto [overscroll-behavior:contain] bg-[var(--card)] pb-3">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[72px]" />
            <col className="w-[240px]" />
            <col className="w-[140px]" />
            <col className="w-[180px]" />
            <col className="w-[160px]" />
            <col className="w-[120px]" />
            <col />
            <col />
          </colgroup>
          <tbody>
            {(() => {
              const vItems = rowVirtualizer.getVirtualItems();
              const total = rowVirtualizer.getTotalSize();
              const paddingTop = vItems.length > 0 ? vItems[0].start : 0;
              const paddingBottom = vItems.length > 0 ? total - vItems[vItems.length - 1].end : 0;
              return (
                <>
                  {paddingTop > 0 && (
                    <tr aria-hidden="true"><td colSpan={8} style={{ height: paddingTop }} /></tr>
                  )}

                  {vItems.map((vRow) => {
                    const item = items[vRow.index];
                    if (!item) return null;
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                        onClick={() => onOpen(item)}
                        style={{ height: vRow.size }}
                      >
                        <td className="px-4 py-3 tabular-nums text-muted">{vRow.index + 1}</td>
                        <td className="px-4 py-3 font-mono truncate" title={item.txHash || item.id}>{item.txHash || item.id}</td>
                        <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                        <td className="px-4 py-3 whitespace-nowrap">{new Date(item.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatAmount6(item.amount)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{item.currency}</td>
                        <td className="px-4 py-3 truncate" title={item.sender}>{item.sender}</td>
                        <td className="px-4 py-3 truncate" title={item.recipient}>{item.recipient}</td>
                      </tr>
                    );
                  })}

                  {paddingBottom > 0 && (
                    <tr aria-hidden="true"><td colSpan={8} style={{ height: paddingBottom }} /></tr>
                  )}
                </>
              );
            })()}
          </tbody>
        </table>
      </div>

      {/* Панели фильтров */}
      {idDD.open && (
        <DropdownPanel state={idDD} title="ID/tx_hash">
          <input className="ui-input w-full" placeholder="Поиск по id/tx_hash" value={idQuery} onChange={(e) => setIdQuery(e.target.value)} />
        </DropdownPanel>
      )}
      {statusDD.open && (
        <DropdownPanel state={statusDD} title="Статус">
          <div className="space-y-1">
            {(["OPEN","APPROVED","REJECTED"] as AntiFraudCaseStatus[]).map(s => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={statusSet.has(s)} onChange={(e) => setStatusSet(prev => { const n = new Set(prev); if (e.target.checked) n.add(s); else n.delete(s); return n; })} />
                <StatusBadge status={s} />
              </label>
            ))}
          </div>
        </DropdownPanel>
      )}
      {dateDD.open && (
        <DropdownPanel state={dateDD} title="Дата">
          <div className="grid grid-cols-1 gap-2">
            <Flatpickr className="ui-input w-full" options={{ locale: Russian, dateFormat: "Y-m-d" }} placeholder="с" value={dateFrom as any} onChange={(d) => setDateFrom(d?.[0] ? formatDate(d[0]) : undefined)} />
            <Flatpickr className="ui-input w-full" options={{ locale: Russian, dateFormat: "Y-m-d" }} placeholder="по" value={dateTo as any} onChange={(d) => setDateTo(d?.[0] ? formatDate(d[0]) : undefined)} />
          </div>
        </DropdownPanel>
      )}
      {amountDD.open && (
        <DropdownPanel state={amountDD} title="Сумма">
          <div className="grid grid-cols-2 gap-2">
            <input className="ui-input" type="number" inputMode="decimal" placeholder="от" value={minAmount ?? ""} onChange={(e) => setMinAmount(num(e.target.value))} />
            <input className="ui-input" type="number" inputMode="decimal" placeholder="до" value={maxAmount ?? ""} onChange={(e) => setMaxAmount(num(e.target.value))} />
          </div>
        </DropdownPanel>
      )}
      {currencyDD.open && (
        <DropdownPanel state={currencyDD} title="Валюта">
          <div className="space-y-1">
            {availableCurrencies.map(c => (
              <label key={c} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={currencySet.has(c)} onChange={(e) => setCurrencySet(prev => { const n = new Set(prev); if (e.target.checked) n.add(c); else n.delete(c); return n; })} />
                <span>{c}</span>
              </label>
            ))}
          </div>
        </DropdownPanel>
      )}
      {senderDD.open && (
        <DropdownPanel state={senderDD} title="Отправитель">
          <input className="ui-input w-full" placeholder="Имя/кошелёк" value={senderQ} onChange={(e) => setSenderQ(e.target.value)} />
        </DropdownPanel>
      )}
      {recipientDD.open && (
        <DropdownPanel state={recipientDD} title="Получатель">
          <input className="ui-input w-full" placeholder="Имя/кошелёк" value={recipientQ} onChange={(e) => setRecipientQ(e.target.value)} />
        </DropdownPanel>
      )}
    </div>
  );
}

function Th({ children, onClick, active, dir }: { children: React.ReactNode; onClick?: () => void; active?: boolean; dir?: SortDir }) {
  return (
    <th className={`px-4 py-3 text-left text-xs select-none ${onClick ? "cursor-pointer" : ""}`} onClick={onClick}>
      <div className={`inline-flex items-center gap-1 rounded px-1 ${active ? "bg-black/10" : ""}`}>{children}</div>
    </th>
  );
}
function SortIcon({ active, dir }: { active?: boolean; dir?: SortDir }) {
  return <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true" className={`opacity-80 ${active ? "" : "opacity-40"}`}><path d="M7 14l5-5 5 5z" fill="currentColor" transform={dir === "asc" ? "rotate(180 12 12)" : ""} /></svg>;
}
function DropdownPanel({ state, title, children }: { state: any; title: string; children: React.ReactNode }) {
  return (
    <div ref={state.panelRef} className="fixed z-50 card border border-soft rounded-xl shadow-xl p-3" style={{ top: state.pos.top, left: state.pos.left, width: state.pos.width, background: "var(--card)" }}>
      <div className="text-sm font-medium mb-2">{title}</div>
      {children}
      <div className="pt-2 text-right">
        <button className="btn h-8" onClick={() => state.setOpen(false)}>Закрыть</button>
      </div>
    </div>
  );
}

function formatDate(d: Date) {
  const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,"0"); const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function num(v: string) { const x = Number(v.replace(/,/g, ".")); return Number.isFinite(x) ? x : undefined; }
