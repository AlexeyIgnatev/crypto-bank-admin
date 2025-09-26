"use client";
import { useMemo, useRef, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/airbnb.css";
import { Russian } from "flatpickr/dist/l10n/ru.js";
import { Admin } from "../types";

export type AdminSortKey = "firstName" | "lastName" | "login" | "createdAt";
export type SortDir = "asc" | "desc";

type DropdownState = {
  open: boolean; setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  btnRef: React.RefObject<HTMLButtonElement>; panelRef: React.RefObject<HTMLDivElement>;
  pos: { top: number; left: number; width: number };
};
function useDropdown(): DropdownState {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 260 });
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const r = btnRef.current?.getBoundingClientRect(); if (!r) return;
      const width = 260; const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      setPos({ top: r.bottom + 6, left, width });
    };
    update();
    const onDoc = (e: MouseEvent) => {
      if (!(e.target instanceof Node)) return;
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      const el = e.target as Element; if (el.closest && el.closest(".flatpickr-calendar")) return;
      setOpen(false);
    };
    window.addEventListener("resize", update);
    document.addEventListener("mousedown", onDoc);
    return () => { window.removeEventListener("resize", update); document.removeEventListener("mousedown", onDoc); };
  }, [open]);
  return { open, setOpen, btnRef, panelRef, pos } as DropdownState;
}

export default function AdminsTable({ data, onOpen }: { data: Admin[]; onOpen: (a: Admin) => void }) {
  const [sortKey, setSortKey] = useState<AdminSortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // filters
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();

  const nameDD = useDropdown();
  const loginDD = useDropdown();
  const dateDD = useDropdown();

  const filtered = useMemo(() => {
    let res = [...data];
    if (q) {
      const s = q.trim().toLowerCase();
      res = res.filter(a =>
        a.firstName.toLowerCase().includes(s) ||
        a.lastName.toLowerCase().includes(s) ||
        a.login.toLowerCase().includes(s)
      );
    }
    if (dateFrom) {
      const d = new Date(dateFrom).getTime();
      res = res.filter(a => new Date(a.createdAt).getTime() >= d);
    }
    if (dateTo) {
      const d = new Date(dateTo).getTime();
      res = res.filter(a => new Date(a.createdAt).getTime() <= d);
    }
    return res;
  }, [data, q, dateFrom, dateTo]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va: any = (a as any)[sortKey];
      const vb: any = (b as any)[sortKey];
      if (sortKey === "createdAt") return (new Date(va).getTime() - new Date(vb).getTime()) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [filtered, sortKey, sortDir]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { const el = containerRef.current; if (el) el.scrollTop = 0; }, [q, dateFrom, dateTo]);

  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 48,
    overscan: 8,
  });

  function toggleSort(key: AdminSortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-black/10 dark:border-white/10 overflow-hidden card shadow-sm">
      <div className="shrink-0 rounded-t-xl" style={{ background: "var(--primary)" }}>
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[72px]" />
            <col className="w-[200px]" />
            <col className="w-[220px]" />
            <col className="w-[280px]" />
            <col className="w-[200px]" />
            <col className="w-[160px]" />
          </colgroup>
          <thead className="text-white">
            <tr>
              <Th>№</Th>
              <Th onClick={() => toggleSort("firstName")}>
                <div className="flex items-center gap-1">
                  <SortIcon active={sortKey === "firstName"} dir={sortDir} />
                  <span className="px-1">Имя</span>
                  <button ref={nameDD.btnRef} className="hdr-chip" aria-label="Фильтр" onClick={(e) => { e.stopPropagation(); nameDD.setOpen(o => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
              <Th onClick={() => toggleSort("lastName")}>
                <div className="flex items-center gap-1">
                  <SortIcon active={sortKey === "lastName"} dir={sortDir} />
                  <span className="px-1">Фамилия</span>
                </div>
              </Th>
              <Th onClick={() => toggleSort("login")}>
                <div className="flex items-center gap-1">
                  <SortIcon active={sortKey === "login"} dir={sortDir} />
                  <span className="px-1">Логин</span>
                  <button ref={loginDD.btnRef} className="hdr-chip" aria-label="Фильтр" onClick={(e) => { e.stopPropagation(); loginDD.setOpen(o => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
              <Th onClick={() => toggleSort("createdAt")}>
                <div className="flex items-center gap-1">
                  <SortIcon active={sortKey === "createdAt"} dir={sortDir} />
                  <span className="px-1">Создано</span>
                  <button ref={dateDD.btnRef} className="hdr-chip" aria-label="Фильтр" onClick={(e) => { e.stopPropagation(); dateDD.setOpen(o => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
              <Th>
                <div className="flex items-center gap-1">
                  <span className="px-1">Роль</span>
                </div>
              </Th>
            </tr>
          </thead>
        </table>
      </div>

      <div ref={containerRef} className="table-scroll flex-1 min-h-0 overflow-y-auto overflow-x-auto [overscroll-behavior:contain] bg-[var(--card)]">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[72px]" />
            <col className="w-[200px]" />
            <col className="w-[220px]" />
            <col className="w-[280px]" />
            <col className="w-[200px]" />
            <col className="w-[160px]" />
          </colgroup>
          <tbody>
            {(() => {
              const items = rowVirtualizer.getVirtualItems();
              const total = rowVirtualizer.getTotalSize();
              const paddingTop = items.length > 0 ? items[0].start : 0;
              const paddingBottom = items.length > 0 ? total - items[items.length - 1].end : 0;
              return (
                <>
                  {paddingTop > 0 && (<tr aria-hidden="true"><td colSpan={6} style={{ height: paddingTop }} /></tr>)}
                  {items.map(v => {
                    const a = sorted[v.index]; if (!a) return null;
                    return (
                      <tr key={a.id} className="border-b border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer" style={{ height: v.size }} onClick={() => onOpen(a)}>
                        <td className="px-4 py-3 tabular-nums text-muted">{v.index + 1}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{a.firstName}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{a.lastName}</td>
                        <td className="px-4 py-3 truncate" title={a.login}>{a.login}</td>
                        <td className="px-4 py-3 whitespace-nowrap"><span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium" style={{ background: "color-mix(in srgb, var(--success) 20%, transparent)", color: "var(--success-text, #0a0)" }}>{a.role}</span></td>
                        <td className="px-4 py-3 whitespace-nowrap">{new Date(a.createdAt).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                  {paddingBottom > 0 && (<tr aria-hidden="true"><td colSpan={6} style={{ height: paddingBottom }} /></tr>)}
                </>
              );
            })()}
          </tbody>
        </table>
      </div>

      {nameDD.open && (
        <HeaderDropdown pos={nameDD.pos} onClose={() => nameDD.setOpen(false)} portalRef={nameDD.panelRef}>
          <div className="header-dd p-2 w-[260px]">
            <div className="text-sm mb-2 font-medium">Имя / Фамилия</div>
            <input className="ui-input w-full" placeholder="Поиск" value={q} onChange={e => setQ(e.target.value)} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="btn btn-danger w-full h-9" onClick={() => setQ("")}>Сбросить</button>
              <button className="btn btn-success w-full h-9" onClick={() => nameDD.setOpen(false)}>Сохранить</button>
            </div>
          </div>
        </HeaderDropdown>
      )}

      {loginDD.open && (
        <HeaderDropdown pos={loginDD.pos} onClose={() => loginDD.setOpen(false)} portalRef={loginDD.panelRef}>
          <div className="header-dd p-2 w-[260px]">
            <div className="text-sm mb-2 font-medium">Логин</div>
            <input className="ui-input w-full" placeholder="email/логин" value={q} onChange={e => setQ(e.target.value)} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="btn btn-danger w-full h-9" onClick={() => setQ("")}>Сбросить</button>
              <button className="btn btn-success w-full h-9" onClick={() => loginDD.setOpen(false)}>Сохранить</button>
            </div>
          </div>
        </HeaderDropdown>
      )}

      {dateDD.open && (
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
        </HeaderDropdown>
      )}
    </div>
  );
}

function HeaderDropdown({ pos, children, onClose, portalRef }: { pos: { top: number; left: number; width: number }; children: React.ReactNode; onClose: () => void; portalRef: React.RefObject<HTMLDivElement>; }) {
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey); }, [onClose]);
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
    <th className={`px-4 py-3 text-left text-xs font-semibold select-none whitespace-nowrap ${onClick ? "cursor-pointer" : ""}`} onClick={onClick}>
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
