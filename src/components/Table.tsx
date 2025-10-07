"use client";
import { useMemo, useRef, useLayoutEffect, useEffect, useState, type Dispatch, type SetStateAction, type RefObject } from "react";
import { createPortal } from "react-dom";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/airbnb.css";
import { Russian } from "flatpickr/dist/l10n/ru.js";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Transaction, TransactionStatus } from "../types";
import { formatAmount6 } from "@/lib/format";

export type SortKey = "createdAt" | "amount" | "status" | "id";
export type SortDir = "asc" | "desc";

type DropdownState = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  btnRef: React.RefObject<HTMLButtonElement>;
  panelRef: React.RefObject<HTMLDivElement>;
  pos: { top: number; left: number; width: number };
};

function useDropdown(): DropdownState {
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
      // Не закрываем при взаимодействии с календарем Flatpickr
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
  return { open, setOpen, btnRef, panelRef, pos } as DropdownState;
}


import { getTransactions } from "@/lib/api";

export default function Table({ onOpen }: { onOpen: (t: Transaction) => void }) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
  }, []);

  // ===== Фильтры =====
  const [idQuery, setIdQuery] = useState("");
  const [statusSet, setStatusSet] = useState<Set<TransactionStatus>>(new Set());
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
      const res = await getTransactions({
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
        statuses: statusSet.size ? Array.from(statusSet) : undefined,
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

  // Первый запрос и обновление при изменении фильтров/сортировки/лимита
  useEffect(() => {
    setItems([]);
    setOffset(0);
    const el = containerRef.current; if (el) el.scrollTop = 0;
    fetchPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, sortKey, sortDir, idQuery, senderQ, recipientQ, dateFrom, dateTo, minAmount, maxAmount, statusSet, currencySet]);

  // Догрузка следующей страницы
  const canPrev = offset > 0;
  const canNext = offset + items.length < total;

  function loadMore() {
    if (loading || !canNext) return;
    const nextOffset = offset + items.length;
    setOffset(nextOffset);
    fetchPage(nextOffset, false);
  }

  // Виртуализация через @tanstack/react-virtual
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
    if (key === "id") return; // сортировка по id не поддерживается бекендом
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-black/10 dark:border-white/10 overflow-hidden card shadow-sm mb-4">
      {/* Непрокручиваемая шапка на всю ширину карточки */}
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
                  <button ref={idDD.btnRef} className="hdr-chip" aria-label="Фильтр"
                    onClick={(e) => { e.stopPropagation(); idDD.setOpen((o) => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
              <Th onClick={() => toggleSort("status")} active={sortKey === "status"} dir={sortDir}>
                <div className="flex items-center gap-1">
                  <SortIcon active={sortKey === "status"} dir={sortDir} />
                  <span className="px-1">Статус</span>
                  <button ref={statusDD.btnRef} className="hdr-chip" aria-label="Фильтр"
                    onClick={(e) => { e.stopPropagation(); statusDD.setOpen((o) => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
              <Th onClick={() => toggleSort("createdAt")} active={sortKey === "createdAt"} dir={sortDir}>
                <div className="flex items-center gap-1">
                  <SortIcon active={sortKey === "createdAt"} dir={sortDir} />
                  <span className="px-1">Дата</span>
                  <button ref={dateDD.btnRef} className="hdr-chip" aria-label="Фильтр"
                    onClick={(e) => { e.stopPropagation(); dateDD.setOpen((o) => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
              <Th onClick={() => toggleSort("amount")} active={sortKey === "amount"} dir={sortDir}>
                <div className="flex items-center gap-1">
                  <SortIcon active={sortKey === "amount"} dir={sortDir} />
                  <span className="px-1">Сумма</span>
                  <button ref={amountDD.btnRef} className="hdr-chip" aria-label="Фильтр"
                    onClick={(e) => { e.stopPropagation(); amountDD.setOpen((o) => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
              <Th>
                <div className="flex items-center gap-1">
                  <span className="px-1">Валюта</span>
                  <button ref={currencyDD.btnRef} className="hdr-chip" aria-label="Фильтр"
                    onClick={(e) => { e.stopPropagation(); currencyDD.setOpen((o) => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
              <Th>
                <div className="flex items-center gap-1">
                  <span className="px-1">Отправитель</span>
                  <button ref={senderDD.btnRef} className="hdr-chip" aria-label="Фильтр"
                    onClick={(e) => { e.stopPropagation(); senderDD.setOpen((o) => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
              <Th>
                <div className="flex items-center gap-1">
                  <span className="px-1">Получатель</span>
                  <button ref={recipientDD.btnRef} className="hdr-chip" aria-label="Фильтр"
                    onClick={(e) => { e.stopPropagation(); recipientDD.setOpen((o) => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
            </tr>
          </thead>
        </table>
      </div>

      {/* Прокручиваемое тело таблицы c виртуализацией */}
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
                    <tr aria-hidden="true">
                      <td colSpan={8} style={{ height: paddingTop }} />
                    </tr>
                  )}

                  {vItems.map((vRow) => {
                    const t = items[vRow.index];
                    if (!t) return null;
                    return (
                      <tr
                        key={t.id}
                        className="border-b border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                        onClick={() => onOpen(t)}
                        style={{ height: vRow.size }}
                      >
                        <td className="px-4 py-3 tabular-nums text-muted">{vRow.index + 1}</td>
                        <td className="px-4 py-3 font-mono truncate" title={t.id}>{t.id}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${
                            t.status === "SUCCESS" ? "badge-success" :
                            t.status === "PENDING" ? "badge-warning" :
                            t.status === "REJECTED" ? "badge-danger" : "badge-danger"
                          }`}>
                            {t.status === "SUCCESS" ? "Успешно" : t.status === "PENDING" ? "В ожидании" : t.status === "REJECTED" ? "Отклонено" : "Ошибка"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{new Date(t.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatAmount6(t.amount)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{t.currency}</td>
                        <td className="px-4 py-3 truncate" title={t.sender}>{t.sender}</td>
                        <td className="px-4 py-3 truncate" title={t.recipient}>{t.recipient}</td>
                      </tr>
                    );
                  })}

                  {paddingBottom > 0 && (
                    <tr aria-hidden="true">
                      <td colSpan={8} style={{ height: paddingBottom }} />
                    </tr>
                  )}
                </>
              );
            })()}
          </tbody>
        </table>
      </div>

      {/* Порталы фильтров в шапке */}
      {idDD.open && createPortal(
        <HeaderDropdown pos={idDD.pos} onClose={() => idDD.setOpen(false)} portalRef={idDD.panelRef}>
          <div className="header-dd p-2">
            <div className="text-sm mb-2 font-medium">ID/tx_hash</div>
            <input className="ui-input w-full" placeholder="Введите ID" value={idQuery} onChange={(e) => setIdQuery(e.target.value)} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="btn btn-danger w-full h-9" onClick={() => setIdQuery("")}>Сбросить</button>
              <button className="btn btn-success w-full h-9" onClick={() => idDD.setOpen(false)}>Сохранить</button>
            </div>
          </div>
        </HeaderDropdown>, document.body)}

      {statusDD.open && createPortal(
        <HeaderDropdown pos={statusDD.pos} onClose={() => statusDD.setOpen(false)} portalRef={statusDD.panelRef}>
          <div className="header-dd p-2">
            <div className="text-sm mb-2 font-medium">Статусы</div>
            {(["PENDING","SUCCESS","REJECTED","FAILED"] as TransactionStatus[]).map((s) => {
              const checked = statusSet.has(s);
              return (
                <label key={s} className="flex items-center gap-2 py-1 cursor-pointer select-none">
                  <input type="checkbox" className="accent-[var(--primary)]" checked={checked} onChange={() => {
                    const n = new Set(statusSet); checked ? n.delete(s) : n.add(s); setStatusSet(n);
                  }} />
                  <span className="text-sm">{s}</span>
                </label>
              );
            })}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="btn btn-danger w-full h-9" onClick={() => setStatusSet(new Set())}>Сбросить</button>
              <button className="btn btn-success w-full h-9" onClick={() => statusDD.setOpen(false)}>Сохранить</button>
            </div>
          </div>
        </HeaderDropdown>, document.body)}

      {dateDD.open && createPortal(
        <HeaderDropdown pos={dateDD.pos} onClose={() => dateDD.setOpen(false)} portalRef={dateDD.panelRef}>
          <div className="header-dd p-2 w-[260px]">
            <div className="text-sm mb-1 font-medium">Дата от</div>
            <Flatpickr value={dateFrom ? new Date(dateFrom) : null} options={{ enableTime: true, dateFormat: "d.m.Y H:i", time_24hr: true, locale: Russian }} onChange={([d]) => setDateFrom(d ? new Date(d).toISOString() : undefined)} className="ui-input" />
            <div className="text-sm mb-1 mt-3 font-medium">Дата до</div>
            <Flatpickr value={dateTo ? new Date(dateTo) : null} options={{ enableTime: true, dateFormat: "d.m.Y H:i", time_24hr: true, locale: Russian }} onChange={([d]) => setDateTo(d ? new Date(d).toISOString() : undefined)} className="ui-input" />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="btn btn-danger w-full h-9" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>Сбросить</button>
              <button className="btn btn-success w-full h-9" onClick={() => dateDD.setOpen(false)}>Сохранить</button>
            </div>
          </div>
        </HeaderDropdown>, document.body)}

      {amountDD.open && createPortal(
        <HeaderDropdown pos={amountDD.pos} onClose={() => amountDD.setOpen(false)} portalRef={amountDD.panelRef}>
          <div className="header-dd p-2 w-[260px]">
            <div className="text-sm font-medium">Сумма</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input className="ui-input h-9" type="number" placeholder="От" value={minAmount ?? ""} onChange={(e) => setMinAmount(e.target.value === "" ? undefined : Number(e.target.value))} />
              <input className="ui-input h-9" type="number" placeholder="До" value={maxAmount ?? ""} onChange={(e) => setMaxAmount(e.target.value === "" ? undefined : Number(e.target.value))} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="btn btn-danger w-full h-9" onClick={() => { setMinAmount(undefined); setMaxAmount(undefined); }}>Сбросить</button>
              <button className="btn btn-success w-full h-9" onClick={() => amountDD.setOpen(false)}>Сохранить</button>
            </div>
          </div>
        </HeaderDropdown>, document.body)}

      {currencyDD.open && createPortal(
        <HeaderDropdown pos={currencyDD.pos} onClose={() => currencyDD.setOpen(false)} portalRef={currencyDD.panelRef}>
          <div className="header-dd p-2">
            <div className="text-sm mb-2 font-medium">Валюты</div>
            {availableCurrencies.map((c) => {
              const checked = currencySet.has(c);
              return (
                <label key={c} className="flex items-center gap-2 py-1 cursor-pointer select-none">
                  <input type="checkbox" className="accent-[var(--primary)]" checked={checked} onChange={() => { const n = new Set(currencySet); checked ? n.delete(c) : n.add(c); setCurrencySet(n); }} />
                  <span className="text-sm">{c}</span>
                </label>
              );
            })}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="btn btn-danger w-full h-9" onClick={() => setCurrencySet(new Set())}>Сбросить</button>
              <button className="btn btn-success w-full h-9" onClick={() => currencyDD.setOpen(false)}>Сохранить</button>
            </div>
          </div>
        </HeaderDropdown>, document.body)}

      {senderDD.open && createPortal(
        <HeaderDropdown pos={senderDD.pos} onClose={() => senderDD.setOpen(false)} portalRef={senderDD.panelRef}>
          <div className="header-dd p-2 w-[260px]">
            <div className="text-sm mb-2 font-medium">Отправитель</div>
            <input className="ui-input w-full" placeholder="Имя" value={senderQ} onChange={(e) => setSenderQ(e.target.value)} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="btn btn-danger w-full h-9" onClick={() => setSenderQ("")}>Сбросить</button>
              <button className="btn btn-success w-full h-9" onClick={() => senderDD.setOpen(false)}>Сохранить</button>
            </div>
          </div>
        </HeaderDropdown>, document.body)}

      {recipientDD.open && createPortal(
        <HeaderDropdown pos={recipientDD.pos} onClose={() => recipientDD.setOpen(false)} portalRef={recipientDD.panelRef}>
          <div className="header-dd p-2 w-[260px]">
            <div className="text-sm mb-2 font-medium">Получатель</div>
            <input className="ui-input w-full" placeholder="Имя" value={recipientQ} onChange={(e) => setRecipientQ(e.target.value)} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="btn btn-danger w-full h-9" onClick={() => setRecipientQ("")}>Сбросить</button>
              <button className="btn btn-success w-full h-9" onClick={() => recipientDD.setOpen(false)}>Сохранить</button>
            </div>
          </div>
        </HeaderDropdown>, document.body)}
    </div>
  );

}
function HeaderDropdown({ pos, children, onClose, portalRef }: { pos: { top: number; left: number; width: number }; children: React.ReactNode; onClose: () => void; portalRef: React.RefObject<HTMLDivElement>; }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 1000 }}>
      <div ref={portalRef} className="card border border-soft rounded-xl shadow-xl overflow-hidden" style={{ background: "var(--card)" }}>
        {children}
      </div>
    </div>
  );
}


function Th({ children, onClick }: { children: React.ReactNode; onClick?: () => void; active?: boolean; dir?: SortDir }) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold select-none whitespace-nowrap ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1">
        <span>{children}</span>
      </div>
    </th>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={`inline-block text-white/90 ${active ? "opacity-100" : "opacity-50"}`} style={{ width: 12 }} aria-hidden>
      {dir === "asc" ? "↑" : "↓"}
    </span>
  );
}
