"use client";
import { useMemo, useRef, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/airbnb.css";
import { Russian } from "flatpickr/dist/l10n/ru.js";
import { Admin } from "../types";

function roleKeyToLabel(k?: string): string {
  switch ((k || "").toUpperCase()) {
    case "SUPER_ADMIN": return "Супер админ";
    default: return k || "Супер админ";
  }
}
function roleLabelToKey(lbl: string): string {
  const x = (lbl || "").trim().toLowerCase();
  if (x === "супер админ") return "SUPER_ADMIN";
  return lbl;
}


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

export default function AdminsTable({
  data,
  onOpen,
  filters,
  onChangeFilters,
  sort,
  onChangeSort,
}: {
  data: Admin[];
  onOpen: (a: Admin) => void;
  filters: { firstNameQuery?: string; lastNameQuery?: string; emailQuery?: string; createdFrom?: string; createdTo?: string; roles?: string[] };
  onChangeFilters: (patch: Partial<{ firstNameQuery?: string; lastNameQuery?: string; emailQuery?: string; createdFrom?: string; createdTo?: string; roles?: string[] }>) => void;
  sort: { key: AdminSortKey; dir: SortDir };
  onChangeSort: (key: AdminSortKey, dir: SortDir) => void;
}) {
  // локальные поля ввода (применяются на Save)
  const [firstQ, setFirstQ] = useState(filters.firstNameQuery || "");
  const [lastQ, setLastQ] = useState(filters.lastNameQuery || "");
  const [loginQ, setLoginQ] = useState(filters.emailQuery || "");
  const [dateFrom, setDateFrom] = useState<string | undefined>(filters.createdFrom);
  const [dateTo, setDateTo] = useState<string | undefined>(filters.createdTo);
  const [roleSet, setRoleSet] = useState<Set<string>>(new Set((filters.roles || []).map(roleKeyToLabel)));

  useEffect(() => {
    setFirstQ(filters.firstNameQuery || "");
    setLastQ(filters.lastNameQuery || "");
    setLoginQ(filters.emailQuery || "");
    setDateFrom(filters.createdFrom);
    setDateTo(filters.createdTo);
    setRoleSet(new Set((filters.roles || []).map(roleKeyToLabel)));
  }, [filters.firstNameQuery, filters.lastNameQuery, filters.emailQuery, filters.createdFrom, filters.createdTo, JSON.stringify(filters.roles || [])]);

  const firstDD = useDropdown();
  const lastDD = useDropdown();
  const loginDD = useDropdown();
  const dateDD = useDropdown();
  const roleDD = useDropdown();

  // Порядок и фильтрация приходят уже с бэкенда: используем как есть
  const rows = data;

  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { const el = containerRef.current; if (el) el.scrollTop = 0; }, [firstQ, lastQ, loginQ, dateFrom, dateTo, roleSet]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 48,
    overscan: 8,
    initialRect: { width: 0, height: 600 },
  });

  function toggleSort(key: AdminSortKey) {
    const nextDir: SortDir = (sort.key === key ? (sort.dir === "asc" ? "desc" : "asc") : "asc");
    onChangeSort(key, nextDir);
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
                  <SortIcon active={sort.key === "firstName"} dir={sort.dir} />
                  <span className="px-1">Имя</span>
                  <button ref={firstDD.btnRef} className="hdr-chip" aria-label="Фильтр" onClick={(e) => { e.stopPropagation(); firstDD.setOpen(o => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
              <Th onClick={() => toggleSort("lastName")}>
                <div className="flex items-center gap-1">
                  <SortIcon active={sort.key === "lastName"} dir={sort.dir} />
                  <span className="px-1">Фамилия</span>
                  <button ref={lastDD.btnRef} className="hdr-chip" aria-label="Фильтр" onClick={(e) => { e.stopPropagation(); lastDD.setOpen(o => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
              <Th onClick={() => toggleSort("login")}>
                <div className="flex items-center gap-1">
                  <SortIcon active={sort.key === "login"} dir={sort.dir} />
                  <span className="px-1">Логин</span>
                  <button ref={loginDD.btnRef} className="hdr-chip" aria-label="Фильтр" onClick={(e) => { e.stopPropagation(); loginDD.setOpen(o => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
              <Th>
                <div className="flex items-center gap-1">
                  <span className="px-1">Роль</span>
                  <button ref={roleDD.btnRef} className="hdr-chip" aria-label="Фильтр" onClick={(e) => { e.stopPropagation(); roleDD.setOpen(o => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
              <Th onClick={() => toggleSort("createdAt")}>
                <div className="flex items-center gap-1">
                  <SortIcon active={sort.key === "createdAt"} dir={sort.dir} />
                  <span className="px-1">Создано</span>
                  <button ref={dateDD.btnRef} className="hdr-chip" aria-label="Фильтр" onClick={(e) => { e.stopPropagation(); dateDD.setOpen(o => !o); }}>
                    <span className="chev">▾</span>
                  </button>
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
                    const a = rows[v.index]; if (!a) return null;
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

      {firstDD.open && (
        <HeaderDropdown pos={firstDD.pos} onClose={() => firstDD.setOpen(false)} portalRef={firstDD.panelRef}>
          <div className="header-dd p-2 w-[260px]">
            <div className="text-sm mb-2 font-medium">Имя</div>
            <input className="ui-input w-full" placeholder="Имя содержит" value={firstQ} onChange={e => setFirstQ(e.target.value)} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="btn btn-danger w-full h-9" onClick={() => setFirstQ("")}>Сбросить</button>
              <button className="btn btn-success w-full h-9" onClick={() => { onChangeFilters({ firstNameQuery: firstQ || undefined }); firstDD.setOpen(false); }}>Сохранить</button>
            </div>
          </div>
        </HeaderDropdown>
      )}

      {lastDD.open && (
        <HeaderDropdown pos={lastDD.pos} onClose={() => lastDD.setOpen(false)} portalRef={lastDD.panelRef}>
          <div className="header-dd p-2 w-[260px]">
            <div className="text-sm mb-2 font-medium">Фамилия</div>
            <input className="ui-input w-full" placeholder="Фамилия содержит" value={lastQ} onChange={e => setLastQ(e.target.value)} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="btn btn-danger w-full h-9" onClick={() => setLastQ("")}>Сбросить</button>
              <button className="btn btn-success w-full h-9" onClick={() => { onChangeFilters({ lastNameQuery: lastQ || undefined }); lastDD.setOpen(false); }}>Сохранить</button>
            </div>
          </div>
        </HeaderDropdown>
      )}

      {loginDD.open && (
        <HeaderDropdown pos={loginDD.pos} onClose={() => loginDD.setOpen(false)} portalRef={loginDD.panelRef}>
          <div className="header-dd p-2 w-[260px]">
            <div className="text-sm mb-2 font-medium">Логин</div>
            <input className="ui-input w-full" placeholder="email/логин" value={loginQ} onChange={e => setLoginQ(e.target.value)} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="btn btn-danger w-full h-9" onClick={() => setLoginQ("")}>Сбросить</button>
              <button className="btn btn-success w-full h-9" onClick={() => { onChangeFilters({ emailQuery: loginQ || undefined }); loginDD.setOpen(false); }}>Сохранить</button>
            </div>
          </div>
        </HeaderDropdown>
      )}

      {roleDD.open && (
        <HeaderDropdown pos={roleDD.pos} onClose={() => roleDD.setOpen(false)} portalRef={roleDD.panelRef}>
          <div className="header-dd p-2 w-[260px]">
            <div className="text-sm mb-2 font-medium">Роль</div>
            <div className="space-y-2">
              {Array.from(new Set(data.map(a => a.role))).map(role => (
                <label key={role} className="flex items-center gap-2">
                  <input type="checkbox" checked={roleSet.has(role)} onChange={(e) => {
                    setRoleSet(prev => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(role); else next.delete(role);
                      return next;
                    });
                  }} />
                  <span>{role}</span>
                </label>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="btn btn-danger w-full h-9" onClick={() => setRoleSet(new Set())}>Сбросить</button>
              <button className="btn btn-success w-full h-9" onClick={() => { onChangeFilters({ roles: Array.from(roleSet).map(roleLabelToKey) }); roleDD.setOpen(false); }}>Сохранить</button>
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
              <button className="btn btn-success w-full h-9" onClick={() => { onChangeFilters({ createdFrom: dateFrom, createdTo: dateTo }); dateDD.setOpen(false); }}>Сохранить</button>
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
