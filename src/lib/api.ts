import { Admin, Transaction, TransactionStatus, User } from "@/types";

function mapCurrency(x?: string): string {
  switch (x) {
    case "SOM": return "COM";
    case "ESOM": return "SALAM";
    case "USDT_TRC20": return "USDT";
    default: return x || "COM";
  }
}

function mapTxStatus(x?: string): TransactionStatus {
  switch ((x || "").toUpperCase()) {
    case "SUCCESS": return "confirmed";
    case "FAILED": return "declined";
    default: return "pending";
  }
}

export async function getTransactions(params: { offset?: number; limit?: number; }): Promise<{ items: Transaction[]; total: number; offset: number; limit: number; }> {
  const q = new URLSearchParams();
  if (params.offset != null) q.set("offset", String(params.offset));
  if (params.limit != null) q.set("limit", String(params.limit));
  const res = await fetch(`/api/transactions/list?${q.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load transactions");
  const data = await res.json();
  const items: Transaction[] = (data.items || []).map((it: any) => ({
    id: String(it.tx_hash || it.id),
    status: mapTxStatus(it.status),
    createdAt: it.createdAt,
    amount: Number(it.som_amount ?? 0),
    currency: mapCurrency(it.asset),
    sender: it.sender_customer ? [it.sender_customer.last_name, it.sender_customer.first_name].filter(Boolean).join(" ") : (it.sender_wallet_address || "—"),
    recipient: it.receiver_customer ? [it.receiver_customer.last_name, it.receiver_customer.first_name].filter(Boolean).join(" ") : (it.receiver_wallet_address || "—"),
  }));
  return { items, total: data.total ?? items.length, offset: data.offset ?? 0, limit: data.limit ?? items.length };
}

export async function getStatsToday(): Promise<{ total: number; bank: number; wallet: number; users: number; }> {
  const res = await fetch(`/api/transactions/stats/today`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load stats");
  const d = await res.json();
  function num(v: any): number {
    if (typeof v === "number") return v;
    if (v && typeof v === "object") {
      // try common shapes
      if (typeof v.value === "number") return v.value;
      const vs = Object.values(v).filter(x => typeof x === "number") as number[];
      if (vs.length) return vs.reduce((a, b) => a + b, 0);
    }
    const n = Number(v); return Number.isFinite(n) ? n : 0;
  }
  return {
    total: num(d.total_amount_som),
    bank: num(d.bank_to_bank_som),
    wallet: num(d.wallet_to_wallet_som),
    users: Number(d.users_count ?? 0),
  };
}

export async function getUsers(params: { offset?: number; limit?: number; search?: string; statuses?: ("ACTIVE"|"BLOCKED")[] }): Promise<{ items: User[]; total: number; offset: number; limit: number; }> {
  const q = new URLSearchParams();
  if (params.offset != null) q.set("offset", String(params.offset));
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.search) q.set("search", params.search);
  if (params.statuses && params.statuses.length) for (const s of params.statuses) q.append("status", s);
  const res = await fetch(`/api/user-management?${q.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load users");
  const data = await res.json();
  const items: User[] = (data.items || []).map((u: any) => ({
    id: String(u.customer_id ?? u.id ?? u.userId ?? ""),
    fullName: [u.last_name ?? u.lastName, u.first_name ?? u.firstName, u.middle_name ?? u.middleName].filter(Boolean).join(" "),
    phone: u.phone || "",
    email: u.email || "",
    status: (u.status === "BLOCKED" || u.status === "Заблокирован") ? "Заблокирован" : "Активен",
    balances: {
      COM: Number(u.balances?.SOM ?? u.balances?.COM ?? 0),
      SALAM: Number(u.balances?.ESOM ?? u.balances?.SALAM ?? 0),
      BTC: Number(u.balances?.BTC ?? 0),
      ETH: Number(u.balances?.ETH ?? 0),
      USDT: Number(u.balances?.USDT_TRC20 ?? u.balances?.USDT ?? 0),
    },
    createdAt: u.createdAt || new Date().toISOString(),
  }));
  return { items, total: data.total ?? items.length, offset: data.offset ?? 0, limit: data.limit ?? items.length };
}

export async function createUser(payload: { firstName: string; lastName: string; middleName?: string; phone: string; email: string; status: "Активен"|"Заблокирован"; }) {
  const body = {
    firstName: payload.firstName,
    lastName: payload.lastName,
    middleName: payload.middleName || "",
    phone: payload.phone,
    email: payload.email,
    status: payload.status === "Заблокирован" ? "BLOCKED" : "ACTIVE",
  };
  const res = await fetch(`/api/user-management`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error("Failed to create user");
  return res.json();
}

export async function updateUser(id: string|number, payload: Partial<{ firstName: string; lastName: string; middleName?: string; phone: string; email: string; status: "Активен"|"Заблокирован"; }>) {
  const body: any = { ...payload };
  if (body.status) body.status = body.status === "Заблокирован" ? "BLOCKED" : "ACTIVE";
  const res = await fetch(`/api/user-management/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error("Failed to update user");
  return res.json();
}

export async function deleteUser(id: string|number) {
  const res = await fetch(`/api/user-management/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete user");
  return true;
}

export async function getAdmins(params: { offset?: number; limit?: number; }): Promise<{ items: Admin[]; total: number; offset: number; limit: number; }> {
  const q = new URLSearchParams();
  if (params.offset != null) q.set("offset", String(params.offset));
  if (params.limit != null) q.set("limit", String(params.limit));
  const res = await fetch(`/api/admin-management?${q.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load admins");
  const data = await res.json();
  const items: Admin[] = (data.items || data || []).map((a: any) => ({
    id: String(a.id),
    firstName: a.firstName || "",
    lastName: a.lastName || "",
    login: a.email || "",
    role: "Супер админ",
    createdAt: a.createdAt || new Date().toISOString(),
  }));
  return { items, total: data.total ?? items.length, offset: data.offset ?? 0, limit: data.limit ?? items.length };
}

export async function createAdmin(payload: { email: string; password: string; firstName: string; lastName: string; role: string; }) {
  const res = await fetch(`/api/admin-management`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error("Failed to create admin");
  return res.json();
}

export async function updateAdmin(id: string | number, payload: Partial<{ email: string; password: string; firstName: string; lastName: string; role: string; }>) {
  const res = await fetch(`/api/admin-management/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error("Failed to update admin");
  return res.json();
}

export async function deleteAdmin(id: string | number) {
  const res = await fetch(`/api/admin-management/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete admin");
  return true;
}

export async function getSettings(): Promise<Record<string, string>> {
  const res = await fetch(`/api/blockchain-config/settings`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load settings");
  return res.json();
}

export async function putSettings(payload: Record<string, string>) {
  const res = await fetch(`/api/blockchain-config/settings`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error("Failed to save settings");
  return res.json();
}
