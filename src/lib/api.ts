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
    case "SUCCESS": return "SUCCESS";
    case "FAILED": return "FAILED";
    case "REJECTED": return "REJECTED";
    default: return "PENDING";
  }
}

type BackendStatus = "SUCCESS" | "FAILED" | "PENDING" | "REJECTED";

function mapUiStatusToBackend(x: TransactionStatus): BackendStatus {
  return (x as BackendStatus);
}

function mapDisplayToAsset(x: string): string {
  switch (x) {
    case "COM": return "SOM";
    case "SALAM": return "ESOM";
    case "USDT": return "USDT_TRC20";
    default: return x; // BTC, ETH
  }
}

export async function getTransactions(params: {
  offset?: number;
  limit?: number;
  sortBy?: "createdAt" | "amount" | "status" | "kind";
  sortDir?: "asc" | "desc";
  id?: string;
  txHash?: string;
  sender?: string;
  receiver?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  statuses?: TransactionStatus[];
  currencies?: string[]; // COM, SALAM, BTC, ETH, USDT
}): Promise<{ items: Transaction[]; total: number; offset: number; limit: number; }> {
  const q = new URLSearchParams();
  if (params.offset != null) q.set("offset", String(params.offset));
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.sortBy) q.set("sort_by", params.sortBy);
  if (params.sortDir) q.set("sort_dir", params.sortDir);
  if (params.id) q.set("id", params.id);
  if (params.txHash) q.set("tx_hash", params.txHash);
  if (params.sender) q.set("sender", params.sender);
  if (params.receiver) q.set("receiver", params.receiver);
  if (params.dateFrom) q.set("date_from", params.dateFrom);
  if (params.dateTo) q.set("date_to", params.dateTo);
  if (typeof params.minAmount === "number") q.set("amount_min", String(params.minAmount));
  if (typeof params.maxAmount === "number") q.set("amount_max", String(params.maxAmount));
  if (params.statuses && params.statuses.length) {
    for (const s of params.statuses) q.append("status", mapUiStatusToBackend(s));
  }
  if (params.currencies && params.currencies.length) {
    for (const c of params.currencies) q.append("asset", mapDisplayToAsset(c));
  }

  const res = await fetch(`/api/transactions/list?${q.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load transactions");
  const data = await res.json();
  const items: Transaction[] = (data.items || []).map((it: any) => ({
    id: String(it.tx_hash || it.id),
    status: mapTxStatus(it.status),
    createdAt: it.createdAt,
    amount: Number(it.amount ?? 0),
    currency: mapCurrency(it.asset),
    sender: it.sender_customer ? [it.sender_customer.last_name, it.sender_customer.first_name].filter(Boolean).join(" ") : (it.sender_wallet_address || "—"),
    recipient: it.receiver_customer ? [it.receiver_customer.last_name, it.receiver_customer.first_name].filter(Boolean).join(" ") : (it.receiver_wallet_address || "—"),
  } as Transaction));
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

export async function getUsers(params: {
  offset?: number; limit?: number;
  search?: string; statuses?: ("ACTIVE"|"BLOCKED")[];
  sortBy?: "customer_id"|"fio"|"phone"|"email"|"status"|"som_balance"|"total_balance"|"createdAt";
  sortDir?: "asc"|"desc";
}): Promise<{ items: User[]; total: number; offset: number; limit: number; }> {
  const q = new URLSearchParams();
  if (params.offset != null) q.set("offset", String(params.offset));
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.search) q.set("search", params.search);
  if (params.statuses && params.statuses.length) for (const s of params.statuses) q.append("status", s);
  if (params.sortBy) q.set("sort_by", params.sortBy);
  if (params.sortDir) q.set("sort_dir", params.sortDir);
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

function roleLabelFromKey(k?: string): string {
  switch ((k || "").toUpperCase()) {
    case "SUPER_ADMIN": return "Супер админ";
    default: return k || "Супер админ";
  }
}
function roleKeyFromLabel(lbl: string): string {
  const x = lbl.trim().toLowerCase();
  if (x === "супер админ") return "SUPER_ADMIN";
  return lbl;
}

export async function getAdmins(params: {
  offset?: number; limit?: number;
  firstNameQuery?: string; lastNameQuery?: string; emailQuery?: string;
  roles?: string[]; // backend role keys e.g. SUPER_ADMIN
  createdFrom?: string; createdTo?: string; // ISO
  sortFirstName?: "asc" | "desc";
  sortLastName?: "asc" | "desc";
  sortEmail?: "asc" | "desc";
  sortCreatedAt?: "asc" | "desc";
}): Promise<{ items: Admin[]; total: number; offset: number; limit: number; }> {
  const q = new URLSearchParams();
  if (params.offset != null) q.set("offset", String(params.offset));
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.firstNameQuery) q.set("firstNameQuery", params.firstNameQuery);
  if (params.lastNameQuery) q.set("lastNameQuery", params.lastNameQuery);
  if (params.emailQuery) q.set("emailQuery", params.emailQuery);
  if (params.roles && params.roles.length) for (const r of params.roles) q.append("roles", r);
  if (params.createdFrom) q.set("createdFrom", params.createdFrom);
  if (params.createdTo) q.set("createdTo", params.createdTo);
  if (params.sortFirstName) q.set("sortFirstName", params.sortFirstName);
  if (params.sortLastName) q.set("sortLastName", params.sortLastName);
  if (params.sortEmail) q.set("sortEmail", params.sortEmail);
  if (params.sortCreatedAt) q.set("sortCreatedAt", params.sortCreatedAt);

  const res = await fetch(`/api/admin-management?${q.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load admins");
  const data = await res.json();
  const itemsSrc: any[] = data.items || data || [];
  const items: Admin[] = itemsSrc.map((a: any) => ({
    id: String(a.id),
    firstName: a.firstName || "",
    lastName: a.lastName || "",
    login: a.email || "",
    role: roleLabelFromKey(a.role || "SUPER_ADMIN"),
    createdAt: a.createdAt || new Date().toISOString(),
  }));
  return { items, total: data.total ?? items.length, offset: data.offset ?? 0, limit: data.limit ?? items.length };
}

export async function createAdmin(payload: { email: string; password: string; firstName: string; lastName: string; role: string; }) {
  const body = { ...payload, role: roleKeyFromLabel(payload.role) };
  const res = await fetch(`/api/admin-management`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error("Failed to create admin");
  return res.json();
}

export async function updateAdmin(id: string | number, payload: Partial<{ email: string; password: string; firstName: string; lastName: string; role: string; }>) {
  const body = { ...payload } as any;
  if (body.role) body.role = roleKeyFromLabel(body.role);
  const res = await fetch(`/api/admin-management/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error("Failed to update admin");
  return res.json();
}

export async function deleteAdmin(id: string | number) {
  const res = await fetch(`/api/admin-management/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete admin");
  return true;
}

export async function getTransactionsStats(params: {
  dateFrom?: string; dateTo?: string;
  statuses?: TransactionStatus[];
  currencies?: string[];
  operations?: ("bank"|"crypto"|"exchange")[];
  metric?: "sum"|"count";
  bucket?: "day"|"week"|"month";
}): Promise<{
  points: { ts: number; label: string; value: number }[];
  totalSum: number;
  totalCount: number;
  topCurrencyBySumLabel: string;
  topCurrencyByCountLabel: string;
  mostActiveDayLabel: string;
  averageCheck: number;
}> {
  const opMap: Record<string, string> = { bank: "BANK_TO_BANK", crypto: "WALLET_TO_WALLET", exchange: "CONVERSION" };
  const q = new URLSearchParams();
  if (params.dateFrom) q.set("date_from", params.dateFrom);
  if (params.dateTo) q.set("date_to", params.dateTo);
  if (params.statuses && params.statuses.length) for (const s of params.statuses) q.append("status", mapUiStatusToBackend(s));
  if (params.currencies && params.currencies.length) for (const c of params.currencies) q.append("asset", mapDisplayToAsset(c));
  if (params.operations && params.operations.length) for (const o of params.operations) q.append("kind", opMap[o] || o);
  if (params.metric) q.set("metric", params.metric);
  if (params.bucket) q.set("group_by", params.bucket);
  const res = await fetch(`/api/transactions/stats?${q.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load transactions stats");
  const d = await res.json();
  const series = Array.isArray(d.series) ? d.series : [];
  const summary = d.summary || {};
  const points = series.map((p: any) => {
    const iso = String(p.date);
    const ts = Date.parse(iso);
    const label = isNaN(ts) ? String(p.date) : new Date(iso).toISOString().slice(0, 10).split("-").reverse().join(".");
    return { ts: isNaN(ts) ? 0 : ts, label, value: Number(p.value ?? 0) };
  });
  const mapCurrencyToDisplay = (x?: string) => {
    const display = mapCurrency(x);
    if (display === "COM") return "СОМ";
    if (display === "SALAM") return "САЛАМ";
    return display;
  };
  const totalSum = Number(summary.total_sum_som ?? 0);
  const totalCount = Number(summary.total_count ?? 0);
  const topCurrencyBySumLabel = mapCurrencyToDisplay(summary.top_currency_by_sum);
  const topCurrencyByCountLabel = mapCurrencyToDisplay(summary.top_currency_by_count);
  const mostActiveDayLabel = typeof summary.most_active_day === "string" && summary.most_active_day
    ? summary.most_active_day.slice(0, 10).split("-").reverse().join(".")
    : "—";
  const averageCheck = Number(summary.average_check_som ?? 0);
  return { points, totalSum, totalCount, topCurrencyBySumLabel, topCurrencyByCountLabel, mostActiveDayLabel, averageCheck };
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

// Helpers for assets mapping between backend codes and UI labels
function mapAssetToDisplay(x?: string): string {
  switch (x) {
    case "SOM": return "COM";
    case "ESOM": return "SALAM";
    case "USDT_TRC20": return "USDT";
    default: return x || "COM";
  }
}
function mapDisplayToAsset(x?: string): string {
  switch (x) {
    case "COM": return "SOM";
    case "SALAM": return "ESOM";
    case "USDT": return "USDT_TRC20";
    default: return x || "SOM";
  }
}

// ===== Antifraud =====
export type AntiFraudRule = {
  id: number;
  key: string;
  enabled: boolean;
  period_days?: any;
  threshold_som?: any;
  min_count?: any;
  percent_threshold?: any;
  updatedAt: string;
};
export type AntiFraudRuleUpdate = Partial<{ enabled: boolean; period_days: any; threshold_som: any; min_count: any; percent_threshold: any; }>

export async function getAntifraudRules(): Promise<AntiFraudRule[]> {
  const res = await fetch(`/api/antifraud/rules`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load antifraud rules");
  return res.json();
}
export async function updateAntifraudRule(key: string, payload: AntiFraudRuleUpdate): Promise<AntiFraudRule> {
  const res = await fetch(`/api/antifraud/rules/${encodeURIComponent(key)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error("Failed to update antifraud rule");
  return res.json();
}

export type AntiFraudCaseStatus = "OPEN"|"APPROVED"|"REJECTED";
export type AntiFraudCaseItem = {
  id: string; // case id as string
  status: AntiFraudCaseStatus;
  createdAt: string; // case createdAt
  amount: number; // transaction.amount
  currency: string; // display currency
  sender: string;
  recipient: string;
  txId?: string; // transaction id
  txHash?: string;
};
export async function getAntifraudCases(params: {
  offset?: number; limit?: number;
  sortBy?: "createdAt"|"amount"|"status"|"kind";
  sortDir?: "asc"|"desc";
  id?: string; txHash?: string; sender?: string; receiver?: string;
  dateFrom?: string; dateTo?: string;
  minAmount?: number; maxAmount?: number;
  currencies?: string[];
  operations?: string[];
  caseStatus?: AntiFraudCaseStatus;
  caseStatuses?: AntiFraudCaseStatus[];
}): Promise<{ items: AntiFraudCaseItem[]; total: number; offset: number; limit: number; }> {
  const q = new URLSearchParams();
  if (params.offset != null) q.set("offset", String(params.offset));
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.sortBy) q.set("sort_by", params.sortBy);
  if (params.sortDir) q.set("sort_dir", params.sortDir);
  if (params.id) q.set("id", params.id);
  if (params.txHash) q.set("tx_hash", params.txHash);
  if (params.sender) q.set("sender", params.sender);
  if (params.receiver) q.set("receiver", params.receiver);
  if (params.dateFrom) q.set("date_from", params.dateFrom);
  if (params.dateTo) q.set("date_to", params.dateTo);
  if (typeof params.minAmount === "number") q.set("amount_min", String(params.minAmount));
  if (typeof params.maxAmount === "number") q.set("amount_max", String(params.maxAmount));
  if (params.currencies && params.currencies.length) for (const c of params.currencies) q.append("asset", mapDisplayToAsset(c));
  if (params.operations && params.operations.length) for (const o of params.operations) q.append("kind", o);
  if (params.caseStatus) q.set("case_status", params.caseStatus);
  if (params.caseStatuses && params.caseStatuses.length) for (const s of params.caseStatuses) q.append("case_status", s);

  const res = await fetch(`/api/antifraud/cases?${q.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load antifraud cases");
  const data = await res.json();
  const items: AntiFraudCaseItem[] = (data.items || []).map((it: any) => {
    const tx = it.transaction || {};
    const senderLabel = tx.sender_customer ? [tx.sender_customer.last_name, tx.sender_customer.first_name].filter(Boolean).join(" ") : (tx.sender_wallet_address || "—");
    const receiverLabel = tx.receiver_customer ? [tx.receiver_customer.last_name, tx.receiver_customer.first_name].filter(Boolean).join(" ") : (tx.receiver_wallet_address || "—");
    return {
      id: String(it.id),
      status: (it.status || it.case_status || "OPEN") as AntiFraudCaseStatus,
      createdAt: tx.createdAt || it.createdAt,
      amount: Number(tx.amount ?? 0),
      currency: mapAssetToDisplay(tx.asset),
      sender: senderLabel,
      recipient: receiverLabel,
      txId: String(tx.id || ""),
      txHash: tx.tx_hash,
    } as AntiFraudCaseItem;
  });
  return { items, total: data.total ?? items.length, offset: data.offset ?? 0, limit: data.limit ?? items.length };
}

export async function approveAntifraudCase(id: string|number) {
  const res = await fetch(`/api/antifraud/cases/${id}/approve`, { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to approve case");
  return res.json();
}
export async function rejectAntifraudCase(id: string|number) {
  const res = await fetch(`/api/antifraud/cases/${id}/reject`, { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to reject case");
  return res.json();
}
