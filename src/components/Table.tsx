"use client";
import { useMemo, useRef, useLayoutEffect, useEffect, useState, type Dispatch, type SetStateAction, type RefObject } from "react";
import { createPortal } from "react-dom";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/airbnb.css";
import { Russian } from "flatpickr/dist/l10n/ru.js";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Transaction, TransactionStatus } from "../types";

export type SortKey = "createdAt" | "amount" | "status" | "id";
export type SortDir = "asc" | "desc";

type DropdownState = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  btnRef: React.RefObject<HTMLButtonElement>;
  pos: { top: number; left: number; width: number };
};

function useDropdown(): DropdownState {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 240 });
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.max(220, Math.min(320, r.width + 60));
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      setPos({ top: r.bottom + 6, left, width });
    };
    update();
    const onScroll = () => update();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", update);
    const onDoc = (e: MouseEvent) => {
      if (e.target instanceof Node) {
        if (btnRef.current && btnRef.current.contains(e.target)) return;
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", update);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);
  return { open, setOpen, btnRef, pos } as DropdownState;
}


export default function Table({ data, onOpen }: { data: Transaction[]; onOpen: (t: Transaction) => void }) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const containerRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Убедимся, что у всех предков min-h-0, иначе flex-дети могут не сжиматься
    // В текущем коде это сделано в AppShell и page.tsx
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

  const availableCurrencies = useMemo(() => {
    const arr = Array.from(new Set(data.map((t) => t.currency)));
    const order = ["COM", "SALAM", "BTC", "USDT", "ETH"]; // предпочтительный порядок
    return arr.sort((a, b) => (order.indexOf(a) === -1 ? 999 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 999 : order.indexOf(b)));
  }, [data]);

  // выпадающие меню
  const idDD = useDropdown();
  const statusDD = useDropdown();
  const dateDD = useDropdown();
  const amountDD = useDropdown();
  const currencyDD = useDropdown();
  const senderDD = useDropdown();
  const recipientDD = useDropdown();

  // применяем фильтры перед сортировкой
  const filtered = useMemo(() => {
    let res = [...data];
    if (idQuery) {
      const q = idQuery.trim().toLowerCase();
      res = res.filter((t) => t.id.toLowerCase().includes(q));
    }
    if (statusSet.size) {
      const s = new Set(statusSet);
      res = res.filter((t) => s.has(t.status));
    }
    if (dateFrom) {
      const d = new Date(dateFrom).getTime();
      res = res.filter((t) => new Date(t.createdAt).getTime() >= d);
    }
    if (dateTo) {
      const d = new Date(dateTo).getTime();
      res = res.filter((t) => new Date(t.createdAt).getTime() <= d);
    }
    if (typeof minAmount === "number") res = res.filter((t) => t.amount >= minAmount!);
    if (typeof maxAmount === "number") res = res.filter((t) => t.amount <= maxAmount!);
    if (currencySet.size) {
      const s = new Set(currencySet);
      res = res.filter((t) => s.has(t.currency));
    }
    if (senderQ) {
      const q = senderQ.trim().toLowerCase();
      res = res.filter((t) => t.sender.toLowerCase().includes(q));
    }
    if (recipientQ) {
      const q = recipientQ.trim().toLowerCase();
      res = res.filter((t) => t.recipient.toLowerCase().includes(q));
    }
    return res;
  }, [data, idQuery, statusSet, dateFrom, dateTo, minAmount, maxAmount, currencySet, senderQ, recipientQ]);





  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va: any = (a as any)[sortKey];
      const vb: any = (b as any)[sortKey];
      if (sortKey === "createdAt") return (new Date(va).getTime() - new Date(vb).getTime()) * dir;
      if (sortKey === "amount") return (Number(va) - Number(vb)) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [filtered, sortDir, sortKey]);

  // Виртуализация через @tanstack/react-virtual
  const rowHeight = 48;
  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
  });

  // При смене сортировки — прокручиваем в начало
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTo({ top: 0 });
  }, [sortKey, sortDir]);

  function toggleSort(key: SortKey) {
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
                <div className="flex items-center gap-2">
                  <span>ID/tx_hash</span>
                  <button ref={idDD.btnRef} className="btn btn-ghost h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); idDD.setOpen((o) => !o); }}>Фильтр ▾</button>
                </div>
              </Th>
              <Th onClick={() => toggleSort("status")} active={sortKey === "status"} dir={sortDir}>
                <div className="flex items-center gap-2">
                  <span>Статус</span>
                  <button ref={statusDD.btnRef} className="btn btn-ghost h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); statusDD.setOpen((o) => !o); }}>Фильтр ▾</button>
                </div>
              </Th>
              <Th onClick={() => toggleSort("createdAt")} active={sortKey === "createdAt"} dir={sortDir}>
                <div className="flex items-center gap-2">
                  <span>Дата</span>
                  <button ref={dateDD.btnRef} className="btn btn-ghost h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); dateDD.setOpen((o) => !o); }}>Фильтр ▾</button>
                </div>
              </Th>
              <Th onClick={() => toggleSort("amount")} active={sortKey === "amount"} dir={sortDir}>
                <div className="flex items-center gap-2">
                  <span>Сумма</span>
                  <button ref={amountDD.btnRef} className="btn btn-ghost h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); amountDD.setOpen((o) => !o); }}>Фильтр ▾</button>
                </div>
              </Th>
              <Th>
                <div className="flex items-center gap-2">
                  <span>Валюта</span>
                  <button ref={currencyDD.btnRef} className="btn btn-ghost h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); currencyDD.setOpen((o) => !o); }}>Фильтр ▾</button>
                </div>
              </Th>
              <Th>
                <div className="flex items-center gap-2">
                  <span>Отправитель</span>
                  <button ref={senderDD.btnRef} className="btn btn-ghost h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); senderDD.setOpen((o) => !o); }}>Фильтр ▾</button>
                </div>
              </Th>
              <Th>
                <div className="flex items-center gap-2">
                  <span>Получатель</span>
                  <button ref={recipientDD.btnRef} className="btn btn-ghost h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); recipientDD.setOpen((o) => !o); }}>Фильтр ▾</button>
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
              const items = rowVirtualizer.getVirtualItems();
              const total = rowVirtualizer.getTotalSize();
              const paddingTop = items.length > 0 ? items[0].start : 0;
              const paddingBottom = items.length > 0 ? total - items[items.length - 1].end : 0;
              return (
                <>
                  {paddingTop > 0 && (
                    <tr aria-hidden="true">
                      <td colSpan={8} style={{ height: paddingTop }} />
                    </tr>
                  )}

                  {items.map((vRow) => {
                    const t = sorted[vRow.index];
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
                            t.status === "confirmed" ? "badge-success" :
                            t.status === "pending" ? "badge-warning" :
                            "badge-danger"
                          }`}>
                            {t.status === "confirmed" ? "Подтверждено" : t.status === "pending" ? "В ожидании" : "Отклонено"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{new Date(t.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
        <HeaderDropdown pos={idDD.pos} onClose={() => idDD.setOpen(false)}>
          <div className="p-2">
            <div className="text-sm mb-2 font-medium">ID/tx_hash</div>
            <input className="ui-input w-full h-9" placeholder="Введите ID" value={idQuery} onChange={(e) => setIdQuery(e.target.value)} />
            <div className="mt-2 flex justify-end gap-2">
              <button className="btn btn-ghost h-8" onClick={() => setIdQuery("")}>Очистить</button>
              <button className="btn h-8" onClick={() => idDD.setOpen(false)}>Готово</button>
            </div>
          </div>
        </HeaderDropdown>, document.body)}

      {statusDD.open && createPortal(
        <HeaderDropdown pos={statusDD.pos} onClose={() => statusDD.setOpen(false)}>
          <div className="p-2">
            <div className="text-sm mb-2 font-medium">Статусы</div>
            {(["confirmed","pending","declined"] as TransactionStatus[]).map((s) => {
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
            <div className="mt-2 flex justify-between gap-2">
              <button className="btn btn-ghost h-8" onClick={() => setStatusSet(new Set())}>Сбросить</button>
              <button className="btn h-8" onClick={() => statusDD.setOpen(false)}>Готово</button>
            </div>
          </div>
        </HeaderDropdown>, document.body)}

      {dateDD.open && createPortal(
        <HeaderDropdown pos={dateDD.pos} onClose={() => dateDD.setOpen(false)}>
          <div className="p-2 w-[260px]">
            <div className="text-sm mb-1 font-medium">Дата от</div>
            <Flatpickr options={{ enableTime: true, dateFormat: "d.m.Y H:i", time_24hr: true, locale: Russian, defaultDate: dateFrom ? new Date(dateFrom) : undefined }} onChange={([d]) => setDateFrom(d ? new Date(d).toISOString() : undefined)} className="ui-input" />
            <div className="text-sm mb-1 mt-3 font-medium">Дата до</div>
            <Flatpickr options={{ enableTime: true, dateFormat: "d.m.Y H:i", time_24hr: true, locale: Russian, defaultDate: dateTo ? new Date(dateTo) : undefined }} onChange={([d]) => setDateTo(d ? new Date(d).toISOString() : undefined)} className="ui-input" />
            <div className="mt-2 flex justify-between gap-2">
              <button className="btn btn-ghost h-8" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>Сбросить</button>
              <button className="btn h-8" onClick={() => dateDD.setOpen(false)}>Готово</button>
            </div>
          </div>
        </HeaderDropdown>, document.body)}

      {amountDD.open && createPortal(
        <HeaderDropdown pos={amountDD.pos} onClose={() => amountDD.setOpen(false)}>
          <div className="p-2 w-[260px]">
            <div className="text-sm font-medium">Сумма</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input className="ui-input h-9" type="number" placeholder="От" value={minAmount ?? ""} onChange={(e) => setMinAmount(e.target.value === "" ? undefined : Number(e.target.value))} />
              <input className="ui-input h-9" type="number" placeholder="До" value={maxAmount ?? ""} onChange={(e) => setMaxAmount(e.target.value === "" ? undefined : Number(e.target.value))} />
            </div>
            <div className="mt-2 flex justify-between gap-2">
              <button className="btn btn-ghost h-8" onClick={() => { setMinAmount(undefined); setMaxAmount(undefined); }}>Сбросить</button>
              <button className="btn h-8" onClick={() => amountDD.setOpen(false)}>Готово</button>
            </div>
          </div>
        </HeaderDropdown>, document.body)}

      {currencyDD.open && createPortal(
        <HeaderDropdown pos={currencyDD.pos} onClose={() => currencyDD.setOpen(false)}>
          <div className="p-2">
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
            <div className="mt-2 flex justify-between gap-2">
              <button className="btn btn-ghost h-8" onClick={() => setCurrencySet(new Set())}>Сбросить</button>
              <button className="btn h-8" onClick={() => currencyDD.setOpen(false)}>Готово</button>
            </div>
          </div>
        </HeaderDropdown>, document.body)}

      {senderDD.open && createPortal(
        <HeaderDropdown pos={senderDD.pos} onClose={() => senderDD.setOpen(false)}>
          <div className="p-2 w-[260px]">
            <div className="text-sm mb-2 font-medium">Отправитель</div>
            <input className="ui-input h-9 w-full" placeholder="Имя" value={senderQ} onChange={(e) => setSenderQ(e.target.value)} />
            <div className="mt-2 flex justify-between gap-2">
              <button className="btn btn-ghost h-8" onClick={() => setSenderQ("")}>Сбросить</button>
              <button className="btn h-8" onClick={() => senderDD.setOpen(false)}>Готово</button>
            </div>
          </div>
        </HeaderDropdown>, document.body)}

      {recipientDD.open && createPortal(
        <HeaderDropdown pos={recipientDD.pos} onClose={() => recipientDD.setOpen(false)}>
          <div className="p-2 w-[260px]">
            <div className="text-sm mb-2 font-medium">Получатель</div>
            <input className="ui-input h-9 w-full" placeholder="Имя" value={recipientQ} onChange={(e) => setRecipientQ(e.target.value)} />
            <div className="mt-2 flex justify-between gap-2">
              <button className="btn btn-ghost h-8" onClick={() => setRecipientQ("")}>Сбросить</button>
              <button className="btn h-8" onClick={() => recipientDD.setOpen(false)}>Готово</button>
            </div>
          </div>
        </HeaderDropdown>, document.body)}
    </div>
  );
}
function HeaderDropdown({ pos, children, onClose }: { pos: { top: number; left: number; width: number }; children: React.ReactNode; onClose: () => void; }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 1000 }}>
      <div className="card border border-soft rounded-xl shadow-xl" style={{ background: "var(--card)" }}>
        {children}
      </div>
    </div>
  );
}


function Th({ children, onClick, active, dir }: { children: React.ReactNode; onClick?: () => void; active?: boolean; dir?: SortDir }) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold select-none whitespace-nowrap ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1">
        <span>{children}</span>
        {onClick && dir && (
          <span className={`transition-transform ${active ? "opacity-100" : "opacity-40"}`}>
            {dir === "asc" ? "↑" : "↓"}
          </span>
        )}
      </div>
    </th>
  );
}
