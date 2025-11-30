"use client";
/* eslint-disable react/jsx-key */
/* helper components and icons */
function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  return (
    <span className={`inline-block ${active ? "opacity-100" : "opacity-50"}`} style={{ width: 12 }} aria-hidden>
      {dir === "asc" ? "↑" : "↓"}
    </span>
  );
}
function HeaderDropdown({ pos, children, onClose, portalRef }: { pos: { top: number; left: number; width: number }; children: React.ReactNode; onClose: () => void; portalRef: React.RefObject<HTMLDivElement>; }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 1000 }}>
      <div ref={portalRef} className="card border border-soft rounded-xl shadow-xl overflow-hidden" style={{ background: "var(--card)" }}>
        {children}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, type Dispatch, type SetStateAction, type RefObject } from "react";
import { createPortal } from "react-dom";
import Modal from "@/components/Modal";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/airbnb.css";
import { Russian } from "flatpickr/dist/l10n/ru.js";

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

// Типы для логов админских действий
export type AdminActionLog = {
  id: number;
  admin_id: number;
  ip: string;
  action: string;
  details: any | null; // API: объект/null, но в задаче сказано: либо строка либо null
  createdAt: string; // ISO
};

// Тип для детальной информации об администраторе
type AdminInfo = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export default function AdminLogsPage() {
  const [items, setItems] = useState<AdminActionLog[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  // выпадающие фильтры в шапке
  const adminIdDD = useDropdown();
  const actionDD = useDropdown();

  // Сортировка и фильтры
  const [sortKey, setSortKey] = useState<"createdAt" | "admin_id" | "action">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [adminIdFilter, setAdminIdFilter] = useState<string>("");
  const [actionQuery, setActionQuery] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();
  const dateDD = useDropdown();

  const containerRef = useRef<HTMLDivElement | null>(null);

  async function fetchPage(pageOffset: number, replace: boolean) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        offset: String(pageOffset),
        limit: String(limit),
        sort_by: sortKey,
        sort_dir: sortDir,
      });
      if (adminIdFilter.trim()) params.set("admin_id", adminIdFilter.trim());
      if (actionQuery.trim()) params.set("action_query", actionQuery.trim());
      if (dateFrom) params.set("created_from", dateFrom);
      if (dateTo) params.set("created_to", dateTo);
      const res = await fetch(`/api/audit/admin-actions?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load logs");
      const data = await res.json();
      const nextItems: AdminActionLog[] = (data.items || []).map((x: any) => ({
        id: Number(x.id),
        admin_id: Number(x.admin_id),
        ip: String(x.ip || ""),
        action: String(x.action || ""),
        details: x.details ?? null,
        createdAt: String(x.createdAt || new Date().toISOString()),
      }));
      setTotal(Number(data.total ?? nextItems.length));
      setItems(prev => replace ? nextItems : [...prev, ...nextItems]);
    } catch {
      if (replace) { setItems([]); setTotal(0); }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setItems([]); setOffset(0);
    const el = containerRef.current; if (el) el.scrollTop = 0;
    fetchPage(0, true);
  }, [limit, sortKey, sortDir, adminIdFilter, actionQuery, dateFrom, dateTo]);

  const canNext = offset + items.length < total;
  function loadMore() {
    if (loading || !canNext) return;
    const nextOffset = offset + items.length;
    setOffset(nextOffset);
    fetchPage(nextOffset, false);
  }
  function toggleSort(key: "createdAt" | "admin_id" | "action") {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const onScroll = () => {
      const nearEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 200;
      if (nearEnd) loadMore();
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [canNext, loading, items.length]);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AdminActionLog | null>(null);

  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);

  async function loadAdminInfo(id: number) {
    setAdminLoading(true);
    try {
      const res = await fetch(`/api/admin-management/${id}`, { cache: "no-store" });
      if (res.ok) {
        const a = await res.json();
        setAdminInfo({
          id: Number(a.id),
          email: String(a.email || ""),
          firstName: String(a.firstName || ""),
          lastName: String(a.lastName || ""),
          role: String(a.role || ""),
          createdAt: String(a.createdAt || ""),
          updatedAt: String(a.updatedAt || ""),
        });
      } else setAdminInfo(null);
    } catch {
      setAdminInfo(null);
    } finally {
      setAdminLoading(false);
    }
  }
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden w-full">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold">Логи действий администраторов</div>
          <div className="text-sm text-muted">Показаны последние события с возможностью подгрузки</div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-soft card shadow-sm overflow-hidden">
        <div className="shrink-0 rounded-t-xl" style={{ background: "var(--primary)" }}>
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[96px]" />
              <col className="w-[160px]" />
              <col className="w-[160px]" />
              <col />
              <col />
              <col className="w-[200px]" />
            </colgroup>
            <thead className="text-white">
              <tr>
                <Th>ID</Th>
                <Th onClick={() => toggleSort("admin_id")}>
                  <div className="flex items-center gap-1">
                    <SortIcon active={sortKey === "admin_id"} dir={sortDir} />
                    <span className="px-1">Админ ID</span>
                    <button ref={adminIdDD.btnRef} className="hdr-chip" aria-label="Фильтр" onClick={(e) => { e.stopPropagation(); adminIdDD.setOpen((o) => !o); }}>
                      <span className="chev">▾</span>
                    </button>
                  </div>
                </Th>
                <Th>IP</Th>
                <Th onClick={() => toggleSort("action")}>
                  <div className="flex items-center gap-1">
                    <SortIcon active={sortKey === "action"} dir={sortDir} />
                    <span className="px-1">Действие</span>
                    <button ref={actionDD.btnRef} className="hdr-chip" aria-label="Фильтр" onClick={(e) => { e.stopPropagation(); actionDD.setOpen((o) => !o); }}>
                      <span className="chev">▾</span>
                    </button>
                  </div>
                </Th>
                <Th>Детали</Th>
                <Th onClick={() => toggleSort("createdAt")}>
                  <div className="flex items-center gap-1">
                    <SortIcon active={sortKey === "createdAt"} dir={sortDir} />
                    <span className="px-1">Дата</span>
                    <button ref={dateDD.btnRef} className="hdr-chip" aria-label="Фильтр"
                      onClick={(e) => { e.stopPropagation(); dateDD.setOpen((o) => !o); }}>
                      <span className="chev">▾</span>
                    </button>
                  </div>
                </Th>
              </tr>
            </thead>
          </table>
        </div>

        {/* порталы для фильтров в шапке */}
        {dateDD.open && createPortal(
          <HeaderDropdown pos={dateDD.pos} onClose={() => dateDD.setOpen(false)} portalRef={dateDD.panelRef}>
            <div className="header-dd p-2 w-[300px]">
              <div className="text-sm mb-1 font-medium">Дата от</div>
              <Flatpickr
                value={dateFrom ? new Date(dateFrom) : null}
                options={{ enableTime: true, dateFormat: "d.m.Y H:i", time_24hr: true, locale: Russian }}
                onChange={([d]) => setDateFrom(d ? new Date(d).toISOString() : undefined)}
                className="ui-input"
              />
              <div className="text-sm mb-1 mt-3 font-medium">Дата до</div>
              <Flatpickr
                value={dateTo ? new Date(dateTo) : null}
                options={{ enableTime: true, dateFormat: "d.m.Y H:i", time_24hr: true, locale: Russian }}
                onChange={([d]) => setDateTo(d ? new Date(d).toISOString() : undefined)}
                className="ui-input"
              />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button className="btn btn-danger w-full h-9" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>Сбросить</button>
                <button className="btn btn-success w-full h-9" onClick={() => dateDD.setOpen(false)}>Сохранить</button>
              </div>
            </div>
          </HeaderDropdown>, document.body)}

        {adminIdDD.open && createPortal(
          <HeaderDropdown pos={adminIdDD.pos} onClose={() => adminIdDD.setOpen(false)} portalRef={adminIdDD.panelRef}>
            <div className="header-dd p-2 w-[220px]">
              <div className="text-sm mb-2 font-medium">Admin ID</div>
              <input className="ui-input w-full" placeholder="Напр. 123" value={adminIdFilter} onChange={(e) => setAdminIdFilter(e.target.value)} />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button className="btn btn-danger w-full h-9" onClick={() => setAdminIdFilter("")}>Сбросить</button>
                <button className="btn btn-success w-full h-9" onClick={() => adminIdDD.setOpen(false)}>Сохранить</button>
              </div>
            </div>
          </HeaderDropdown>, document.body)}

        {actionDD.open && createPortal(
          <HeaderDropdown pos={actionDD.pos} onClose={() => actionDD.setOpen(false)} portalRef={actionDD.panelRef}>
            <div className="header-dd p-2 w-[320px]">
              <div className="text-sm mb-2 font-medium">Действие</div>
              <input className="ui-input w-full" placeholder="Поиск по действию" value={actionQuery} onChange={(e) => setActionQuery(e.target.value)} />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button className="btn btn-danger w-full h-9" onClick={() => setActionQuery("")}>Сбросить</button>
                <button className="btn btn-success w-full h-9" onClick={() => actionDD.setOpen(false)}>Сохранить</button>
              </div>
            </div>
          </HeaderDropdown>, document.body)}

        <div ref={containerRef} className="table-scroll flex-1 min-h-0 overflow-y-auto overflow-x-auto [overscroll-behavior:contain] bg-[var(--card)] pb-3">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[96px]" />
              <col className="w-[160px]" />
              <col className="w-[160px]" />
              <col />
              <col />
              <col className="w-[200px]" />
            </colgroup>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer" onClick={() => { setSelected(it); setOpen(true); setAdminInfo(null); loadAdminInfo(it.admin_id); }}>
                  <td className="px-4 py-3 tabular-nums text-muted">{it.id}</td>
                  <td className="px-4 py-3">{it.admin_id}</td>
                  <td className="px-4 py-3 truncate" title={it.ip}>{truncate(it.ip, 24)}</td>
                  <td className="px-4 py-3 truncate" title={it.action}>{truncate(it.action, 64)}</td>
                  <td className="px-4 py-3 truncate" title={formatDetails(it.details)}>{truncate(formatDetails(it.details), 64)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(it.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {loading && (
                <tr><td colSpan={6} className="text-center py-3 text-muted">Загрузка…</td></tr>
              )}
              {!loading && !items.length && (
                <tr><td colSpan={6} className="text-center py-3 text-muted">Нет данных</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Детали события">
        {selected && (
          <div className="space-y-2 text-sm text-fg">
            <Row label="ID" value={<span className="font-mono">{selected.id}</span>} />
            <Row label="Админ ID" value={<span className="font-mono">{selected.admin_id}</span>} />
            <Row label="IP" value={selected.ip} />
            <Row label="Действие" value={selected.action} />
            <Row label="Детали" value={<pre className="whitespace-pre-wrap break-words text-xs p-2 rounded bg-black/5 dark:bg-white/10">{formatDetails(selected.details)}</pre>} />
            <Row label="Дата" value={new Date(selected.createdAt).toLocaleString()} />
            <div className="pt-2">
              <div className="text-sm font-semibold mb-1">Администратор</div>
              {adminLoading ? (
                <div className="text-sm text-muted">Загрузка…</div>
              ) : adminInfo ? (
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="text-muted">ФИО</div>
                  <div className="col-span-2">{[adminInfo.lastName, adminInfo.firstName].filter(Boolean).join(" ") || "—"}</div>
                  <div className="text-muted">Email</div>
                  <div className="col-span-2">{adminInfo.email || "—"}</div>
                  <div className="text-muted">Роль</div>
                  <div className="col-span-2">{adminInfo.role || "—"}</div>
                  <div className="text-muted">Создан</div>
                  <div className="col-span-2">{adminInfo.createdAt ? new Date(adminInfo.createdAt).toLocaleString() : "—"}</div>
                </div>
              ) : (
                <div className="text-sm text-muted">Нет данных</div>
              )}
            </div>
          </div>
        )}
      </Modal>




    </div>
  );
}

function truncate(s: string, n: number) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
function formatDetails(d: any): string {
  if (d == null) return "—";
  if (typeof d === "string") return d;
  try { return JSON.stringify(d); } catch { return String(d); }
}
function Th({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <th onClick={onClick} className="text-left text-xs font-semibold uppercase tracking-wide sticky top-0 px-3 py-2 select-none">
      {children}
    </th>
  );
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 border-t border-soft truncate">{children}</td>;
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 items-start">
      <div className="text-muted">{label}</div>
      <div className="col-span-2 break-words">{value}</div>
    </div>
  );
}
