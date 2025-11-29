"use client";
import { useEffect, useRef, useState } from "react";
import Modal from "@/components/Modal";

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

  // Сортировка и фильтры
  const [sortKey, setSortKey] = useState<"createdAt" | "admin_id" | "action">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [adminIdFilter, setAdminIdFilter] = useState<string>("");
  const [actionQuery, setActionQuery] = useState<string>("");

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
  }, [limit, sortKey, sortDir, adminIdFilter, actionQuery]);

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
        <div className="flex items-center gap-2">
          <input className="ui-input h-9 w-[160px]" placeholder="Admin ID" value={adminIdFilter} onChange={(e) => setAdminIdFilter(e.target.value)} />
          <input className="ui-input h-9 w-[240px]" placeholder="Поиск по действию" value={actionQuery} onChange={(e) => setActionQuery(e.target.value)} />
          <div className="flex items-center gap-1">
            <button className="btn h-9" onClick={() => toggleSort("createdAt")}>Дата {sortKey === "createdAt" ? (sortDir === "asc" ? "↑" : "↓") : ""}</button>
            <button className="btn h-9" onClick={() => toggleSort("admin_id")}>Админ {sortKey === "admin_id" ? (sortDir === "asc" ? "↑" : "↓") : ""}</button>
            <button className="btn h-9" onClick={() => toggleSort("action")}>Действие {sortKey === "action" ? (sortDir === "asc" ? "↑" : "↓") : ""}</button>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden rounded-xl border border-soft card shadow-sm">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[96px]" />
            <col className="w-[160px]" />
            <col className="w-[160px]" />
            <col />
            <col />
            <col className="w-[200px]" />
          </colgroup>
          <thead className="sticky top-0 z-10 text-white" style={{ background: "var(--primary)" }}>
            <tr>
              <Th>ID</Th>
              <Th>Админ ID</Th>
              <Th>IP</Th>
              <Th>Действие</Th>
              <Th>Детали</Th>
              <Th>Дата</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="table-row hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer" onClick={() => { setSelected(it); setOpen(true); setAdminInfo(null); loadAdminInfo(it.admin_id); }}>
                <Td>{it.id}</Td>
                <Td>{it.admin_id}</Td>
                <Td>{truncate(it.ip, 24)}</Td>
                <Td title={it.action}>{truncate(it.action, 64)}</Td>
                <Td title={formatDetails(it.details)}>{truncate(formatDetails(it.details), 64)}</Td>
                <Td>{new Date(it.createdAt).toLocaleString()}</Td>
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
