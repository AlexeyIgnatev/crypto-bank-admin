"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/airbnb.css";
import { Russian } from "flatpickr/dist/l10n/ru.js";
import { User, UserStatus } from "../types";

export type UserSortKey = "fullName" | "phone" | "email" | "status" | "createdAt" | "balanceCOM" | "balanceTotal";
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

export default function UsersTable({ data, onOpen }: { data: User[]; onOpen: (u: User) => void }) {
  const [sortKey, setSortKey] = useState<UserSortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // per-column filters
  const [nameQ, setNameQ] = useState("");
  const [phoneQ, setPhoneQ] = useState("");
  const [emailQ, setEmailQ] = useState("");
  const [statusSet, setStatusSet] = useState<Set<UserStatus>>(new Set());
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();
  const [minCOM, setMinCOM] = useState<string>("");
  const [maxCOM, setMaxCOM] = useState<string>("");
  const [minTotal, setMinTotal] = useState<string>("");
  const [maxTotal, setMaxTotal] = useState<string>("");

  const nameDD = useDropdown();
  const phoneDD = useDropdown();
  const emailDD = useDropdown();
  const statusDD = useDropdown();
  const dateDD = useDropdown();
  const comDD = useDropdown();
  const totalDD = useDropdown();

  const filtered = useMemo(() => {
    let res = [...data];
    if (nameQ) { const s = nameQ.trim().toLowerCase(); res = res.filter(u => u.fullName.toLowerCase().includes(s)); }
    if (phoneQ) { const s = phoneQ.trim().toLowerCase(); res = res.filter(u => u.phone.toLowerCase().includes(s)); }
    if (emailQ) { const s = emailQ.trim().toLowerCase(); res = res.filter(u => u.email.toLowerCase().includes(s)); }
    if (statusSet.size > 0) { res = res.filter(u => statusSet.has(u.status)); }
    if (dateFrom) { const d = new Date(dateFrom).getTime(); res = res.filter(u => new Date(u.createdAt).getTime() >= d); }
    if (dateTo) { const d = new Date(dateTo).getTime(); res = res.filter(u => new Date(u.createdAt).getTime() <= d); }
    // balances filters
    if (minCOM) { const v = parseFloat(minCOM.replace(/\s/g, "")); if (!Number.isNaN(v)) res = res.filter(u => u.balances.COM >= v); }
    if (maxCOM) { const v = parseFloat(maxCOM.replace(/\s/g, "")); if (!Number.isNaN(v)) res = res.filter(u => u.balances.COM <= v); }
    if (minTotal) { const v = parseFloat(minTotal.replace(/\s/g, "")); if (!Number.isNaN(v)) res = res.filter(u => (u.balances.COM + u.balances.SALAM + u.balances.BTC + u.balances.ETH + u.balances.USDT) >= v); }
    if (maxTotal) { const v = parseFloat(maxTotal.replace(/\s/g, "")); if (!Number.isNaN(v)) res = res.filter(u => (u.balances.COM + u.balances.SALAM + u.balances.BTC + u.balances.ETH + u.balances.USDT) <= v); }
    return res;
  }, [data, nameQ, phoneQ, emailQ, statusSet, dateFrom, dateTo, minCOM, maxCOM, minTotal, maxTotal]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const pick = (u: User, key: UserSortKey): any => {
        if (key === "balanceCOM") return u.balances.COM;
        if (key === "balanceTotal") return u.balances.COM + u.balances.SALAM + u.balances.BTC + u.balances.ETH + u.balances.USDT;
        return (u as any)[key];
      };
      const va: any = pick(a, sortKey);
      const vb: any = pick(b, sortKey);
      if (sortKey === "createdAt") return (new Date(va).getTime() - new Date(vb).getTime()) * dir;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [filtered, sortKey, sortDir]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { const el = containerRef.current; if (el) el.scrollTop = 0; }, [nameQ, phoneQ, emailQ, statusSet, dateFrom, dateTo, minCOM, maxCOM, minTotal, maxTotal]);

  const rowVirtualizer = useVirtualizer({ count: sorted.length, getScrollElement: () => containerRef.current, estimateSize: () => 48, overscan: 8 });

  function toggleSort(key: UserSortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-black/10 dark:border-white/10 overflow-hidden card shadow-sm">
      <div className="shrink-0 rounded-t-xl" style={{ background: "var(--primary)" }}>
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[72px]" />
            <col className="w-[320px]" />
            <col className="w-[180px]" />
            <col className="w-[260px]" />
            <col className="w-[160px]" />
            <col className="w-[160px]" />
            <col className="w-[200px]" />
          </colgroup>
          <thead className="text-white">
            <tr>
              <Th>№</Th>
              <Th onClick={() => toggleSort("fullName")}>
                <div className="flex items-center gap-1">
                  <SortIcon active={sortKey === "fullName"} dir={sortDir} />
                  <span className="px-1">ФИО</span>
                  <button ref={nameDD.btnRef} className="hdr-chip" aria-label="Фильтр" onClick={(e) => { e.stopPropagation(); nameDD.setOpen(o => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
              <Th onClick={() => toggleSort("phone")}>
                <div className="flex items-center gap-1">
                  <SortIcon active={sortKey === "phone"} dir={sortDir} />
                  <span className="px-1">Телефон</span>
                  <button ref={phoneDD.btnRef} className="hdr-chip" aria-label="Фильтр" onClick={(e) => { e.stopPropagation(); phoneDD.setOpen(o => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
              <Th onClick={() => toggleSort("email")}>
                <div className="flex items-center gap-1">
                  <SortIcon active={sortKey === "email"} dir={sortDir} />
                  <span className="px-1">E-mail</span>
                  <button ref={emailDD.btnRef} className="hdr-chip" aria-label="Фильтр" onClick={(e) => { e.stopPropagation(); emailDD.setOpen(o => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
              <Th onClick={() => toggleSort("status")}>
                <div className="flex items-center gap-1">
                  <SortIcon active={sortKey === "status"} dir={sortDir} />
                  <span className="px-1">Статус</span>
                  <button ref={statusDD.btnRef} className="hdr-chip" aria-label="Фильтр" onClick={(e) => { e.stopPropagation(); statusDD.setOpen(o => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
              <Th onClick={() => toggleSort("balanceCOM")}>
                <div className="flex items-center gap-1">
                  <SortIcon active={sortKey === "balanceCOM"} dir={sortDir} />
                  <span className="px-1">Баланс СОМ</span>
                  <button ref={comDD.btnRef} className="hdr-chip" aria-label="Фильтр" onClick={(e) => { e.stopPropagation(); comDD.setOpen(o => !o); }}>
                    <span className="chev">▾</span>
                  </button>
                </div>
              </Th>
              <Th onClick={() => toggleSort("balanceTotal")}>
                <div className="flex items-center gap-1">
                  <SortIcon active={sortKey === "balanceTotal"} dir={sortDir} />
                  <span className="px-1">Общий баланс</span>
                  <button ref={totalDD.btnRef} className="hdr-chip" aria-label="Фильтр" onClick={(e) => { e.stopPropagation(); totalDD.setOpen(o => !o); }}>
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
            </tr>
          </thead>
        </table>
      </div>

      <div ref={containerRef} className="table-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden [overscroll-behavior:contain] bg-[var(--card)]">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[72px]" />
            <col className="w-[320px]" />
            <col className="w-[180px]" />
            <col className="w-[260px]" />
            <col className="w-[160px]" />
            <col className="w-[160px]" />
            <col className="w-[200px]" />
          </colgroup>
          <tbody>
            {(() => {
              const items = rowVirtualizer.getVirtualItems();
              const total = rowVirtualizer.getTotalSize();
              const paddingTop = items.length > 0 ? items[0].start : 0;
              const paddingBottom = items.length > 0 ? total - items[items.length - 1].end : 0;
              return (
                <>
                  {paddingTop > 0 && (<tr aria-hidden="true"><td colSpan={7} style={{ height: paddingTop }} /></tr>)}
                  {items.map(v => {
                    const u = sorted[v.index]; if (!u) return null;
                    const totalBalance = u.balances.COM + u.balances.SALAM + u.balances.BTC + u.balances.ETH + u.balances.USDT;
                    return (
                      <tr key={u.id} className="border-b border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer" style={{ height: v.size }} onClick={() => onOpen(u)}>
                        <td className="px-4 py-3 tabular-nums text-muted">{v.index + 1}</td>
                        <td className="px-4 py-3 whitespace-pre-wrap">{u.fullName}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{u.phone}</td>
                        <td className="px-4 py-3 truncate" title={u.email}>{u.email}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${u.status === "Активен" ? "bg-green-500/20 text-green-700" : "bg-red-500/20 text-red-700"}`}>{u.status}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{u.balances.COM.toLocaleString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{totalBalance.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                  {paddingBottom > 0 && (<tr aria-hidden="true"><td colSpan={7} style={{ height: paddingBottom }} /></tr>)}
                </>
              );
            })()}
          </tbody>
        </table>
      </div>

      {nameDD.open && (
        <HeaderDropdown pos={nameDD.pos} onClose={() => nameDD.setOpen(false)} portalRef={nameDD.panelRef}>
          <div className="header-dd p-2 w-[260px]">
            <div className="text-sm mb-2 font-medium">ФИО</div>
            <input className="ui-input w-full" placeholder="ФИО содержит" value={nameQ} onChange={e => setNameQ(e.target.value)} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="btn btn-danger w-full h-9" onClick={() => setNameQ("")}>Сбросить</button>
              <button className="btn btn-success w-full h-9" onClick={() => nameDD.setOpen(false)}>Сохранить</button>
            </div>
          </div>
        </HeaderDropdown>
      )}

      {phoneDD.open && (
        <HeaderDropdown pos={phoneDD.pos} onClose={() => phoneDD.setOpen(false)} portalRef={phoneDD.panelRef}>
          <div className="header-dd p-2 w-[260px]">
            <div className="text-sm mb-2 font-medium">Телефон</div>
            <input className="ui-input w-full" placeholder="Телефон содержит" value={phoneQ} onChange={e => setPhoneQ(e.target.value)} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="btn btn-danger w-full h-9" onClick={() => setPhoneQ("")}>Сбросить</button>
              <button className="btn btn-success w-full h-9" onClick={() => phoneDD.setOpen(false)}>Сохранить</button>
            </div>
          </div>
        </HeaderDropdown>
      )}

      {emailDD.open && (
        <HeaderDropdown pos={emailDD.pos} onClose={() => emailDD.setOpen(false)} portalRef={emailDD.panelRef}>
          <div className="header-dd p-2 w-[260px]">
            <div className="text-sm mb-2 font-medium">E-mail</div>
            <input className="ui-input w-full" placeholder="email содержит" value={emailQ} onChange={e => setEmailQ(e.target.value)} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="btn btn-danger w-full h-9" onClick={() => setEmailQ("")}>Сбросить</button>
              <button className="btn btn-success w-full h-9" onClick={() => emailDD.setOpen(false)}>Сохранить</button>
            </div>
          </div>
        </HeaderDropdown>
      )}

      {statusDD.open && (
        <HeaderDropdown pos={statusDD.pos} onClose={() => statusDD.setOpen(false)} portalRef={statusDD.panelRef}>
          <div className="header-dd p-2 w-[260px]">
            <div className="text-sm mb-2 font-medium">Статус</div>
            {(["Активен","Заблокирован"] as UserStatus[]).map(st => (
              <label key={st} className="flex items-center gap-2">
                <input type="checkbox" checked={statusSet.has(st)} onChange={(e) => {
                  setStatusSet(prev => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(st); else next.delete(st);
                    return next;
                  });
                }} />
                <span>{st}</span>
              </label>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="btn btn-danger w-full h-9" onClick={() => setStatusSet(new Set())}>Сбросить</button>
              <button className="btn btn-success w-full h-9" onClick={() => statusDD.setOpen(false)}>Сохранить</button>
            </div>
          </div>
        </HeaderDropdown>
      )}

      {comDD.open && (
        <HeaderDropdown pos={comDD.pos} onClose={() => comDD.setOpen(false)} portalRef={comDD.panelRef}>
          <div className="header-dd p-2 w-[260px]">
            <div className="text-sm mb-2 font-medium">Баланс СОМ</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs mb-1">Мин</div>
                <input className="ui-input w-full" inputMode="decimal" placeholder="0" value={minCOM} onChange={e => setMinCOM(e.target.value)} />
              </div>
              <div>
                <div className="text-xs mb-1">Макс</div>
                <input className="ui-input w-full" inputMode="decimal" placeholder="∞" value={maxCOM} onChange={e => setMaxCOM(e.target.value)} />
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="btn btn-danger w-full h-9" onClick={() => { setMinCOM(""); setMaxCOM(""); }}>Сбросить</button>
              <button className="btn btn-success w-full h-9" onClick={() => comDD.setOpen(false)}>Сохранить</button>
            </div>
          </div>
        </HeaderDropdown>
      )}

      {totalDD.open && (
        <HeaderDropdown pos={totalDD.pos} onClose={() => totalDD.setOpen(false)} portalRef={totalDD.panelRef}>
          <div className="header-dd p-2 w-[260px]">
            <div className="text-sm mb-2 font-medium">Общий баланс</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs mb-1">Мин</div>
                <input className="ui-input w-full" inputMode="decimal" placeholder="0" value={minTotal} onChange={e => setMinTotal(e.target.value)} />
              </div>
              <div>
                <div className="text-xs mb-1">Макс</div>
                <input className="ui-input w-full" inputMode="decimal" placeholder="∞" value={maxTotal} onChange={e => setMaxTotal(e.target.value)} />
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="btn btn-danger w-full h-9" onClick={() => { setMinTotal(""); setMaxTotal(""); }}>Сбросить</button>
              <button className="btn btn-success w-full h-9" onClick={() => totalDD.setOpen(false)}>Сохранить</button>
            </div>
          </div>
        </HeaderDropdown>
      )}

          </div>
        </HeaderDropdown>
      )}

      {dateDD.open && (

      {comDD.open && (
        <HeaderDropdown pos={comDD.pos} onClose={() => comDD.setOpen(false)} portalRef={comDD.panelRef}>
          <div className="header-dd p-2 w-[260px]">
            <div className="text-sm mb-2 font-medium">Баланс СОМ</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs mb-1">Мин</div>
                <input className="ui-input w-full" inputMode="decimal" placeholder="0" value={minCOM} onChange={e => setMinCOM(e.target.value)} />
              </div>
              <div>
                <div className="text-xs mb-1">Макс</div>
                <input className="ui-input w-full" inputMode="decimal" placeholder="∞" value={maxCOM} onChange={e => setMaxCOM(e.target.value)} />
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="btn btn-danger w-full h-9" onClick={() => { setMinCOM(""); setMaxCOM(""); }}>Сбросить</button>
              <button className="btn btn-success w-full h-9" onClick={() => comDD.setOpen(false)}>Сохранить</button>
            </div>
          </div>
        </HeaderDropdown>
      )}

      {totalDD.open && (
        <HeaderDropdown pos={totalDD.pos} onClose={() => totalDD.setOpen(false)} portalRef={totalDD.panelRef}>
          <div className="header-dd p-2 w-[260px]">
            <div className="text-sm mb-2 font-medium">Общий баланс</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs mb-1">Мин</div>
                <input className="ui-input w-full" inputMode="decimal" placeholder="0" value={minTotal} onChange={e => setMinTotal(e.target.value)} />
              </div>
              <div>
                <div className="text-xs mb-1">Макс</div>
                <input className="ui-input w-full" inputMode="decimal" placeholder="∞" value={maxTotal} onChange={e => setMaxTotal(e.target.value)} />
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="btn btn-danger w-full h-9" onClick={() => { setMinTotal(""); setMaxTotal(""); }}>Сбросить</button>
              <button className="btn btn-success w-full h-9" onClick={() => totalDD.setOpen(false)}>Сохранить</button>
            </div>
          </div>
        </HeaderDropdown>
      )}

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

function SortIcon({ active, dir }: { active?: boolean; dir?: SortDir }) {
  return (
    <span className={`inline-block w-3 text-[10px] ${active ? "opacity-100" : "opacity-40"}`}>{dir === "asc" ? "↑" : "↓"}</span>
  );
}
