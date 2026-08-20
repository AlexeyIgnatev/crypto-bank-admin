import {
  Admin,
  AdminSettings,
  BankCommissionBalances,
  CustomerResidency,
  SupportMessage,
  SupportTicket,
  SupportTicketStatus,
  TariffCategory,
  TreasuryReserves,
  Transaction,
  TransactionStatus,
  User,
} from "@/types";

export type TariffOperation =
  | "SOM_TO_ESOM"
  | "ESOM_TO_SOM"
  | "ESOM_TO_USDT_TRC20"
  | "USDT_TRC20_TO_ESOM"
  | "WALLET_TRANSFER_SOM"
  | "WALLET_TRANSFER_ESOM"
  | "WALLET_TRANSFER_USDT_TRC20";

export type TariffSetting = {
  category: TariffCategory;
  residency: CustomerResidency;
  operation: TariffOperation;
  percent_fee: string;
  fixed_fee: string;
};

function mapCurrency(x?: string): string {
  switch (x) {
    case "SOM":
      return "COM";
    case "ESOM":
      return "Салам";
    case "USDT_TRC20":
      return "USDT TRC20";
    default:
      return x || "COM";
  }
}

function mapTxStatus(x?: string): TransactionStatus {
  switch ((x || "").toUpperCase()) {
    case "SUCCESS":
      return "SUCCESS";
    case "FAILED":
      return "FAILED";
    case "REJECTED":
      return "REJECTED";
    default:
      return "PENDING";
  }
}

type BackendStatus = "SUCCESS" | "FAILED" | "PENDING" | "REJECTED";

function mapUiStatusToBackend(x: TransactionStatus): BackendStatus {
  return x as BackendStatus;
}

function mapDisplayToAssetOld(x: string): string {
  switch (x) {
    case "COM":
      return "SOM";
    case "Салам":
    case "SALAM":
    case "САЛАМ":
      return "ESOM";
    case "USDT":
    case "USDT TRC20":
      return "USDT_TRC20";
    default:
      return x;
  }
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  if (typeof value === "number")
    return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toNumberOrZero(value: unknown): number {
  const parsed = toOptionalNumber(value);
  return parsed ?? 0;
}

async function readErrorBody(res: Response): Promise<string> {
  const raw = await res.text().catch(() => "");
  if (!raw.trim()) return "";

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    if (Array.isArray(parsed?.message)) return parsed.message.join("; ");
    if (typeof parsed?.message === "string") return parsed.message;
    if (typeof parsed?.error === "string") return parsed.error;
    return raw;
  } catch {
    return raw;
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
  currencies?: string[];
}): Promise<{
  items: Transaction[];
  total: number;
  offset: number;
  limit: number;
}> {
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
  if (typeof params.minAmount === "number")
    q.set("amount_min", String(params.minAmount));
  if (typeof params.maxAmount === "number")
    q.set("amount_max", String(params.maxAmount));
  if (params.statuses && params.statuses.length) {
    for (const s of params.statuses)
      q.append("status", mapUiStatusToBackend(s));
  }
  if (params.currencies && params.currencies.length) {
    for (const c of params.currencies)
      q.append("asset", mapDisplayToAssetDisplayHelper(c));
  }

  const res = await fetch(`/api/transactions/list?${q.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load transactions");
  const data = await res.json();
  const items: Transaction[] = (data.items || []).map(
    (it: any) =>
      ({
        id: String(it.tx_hash || it.id),
        status: mapTxStatus(it.status),
        createdAt: it.createdAt,
        amount: Number(it.amount ?? 0),
        feeAmount: Number(it.fee_amount ?? 0),
        currency: mapCurrency(it.asset),
        kind: it.kind,
        comment: typeof it.comment === "string" ? it.comment : undefined,
        sender: it.sender_customer
          ? [it.sender_customer.last_name, it.sender_customer.first_name]
              .filter(Boolean)
              .join(" ")
          : it.sender_wallet_address || "—",
        recipient: it.receiver_customer
          ? [it.receiver_customer.last_name, it.receiver_customer.first_name]
              .filter(Boolean)
              .join(" ")
          : it.external_address || it.receiver_wallet_address || "—",
        senderAbsId:
          it.sender_abs_id != null
            ? String(it.sender_abs_id)
            : it.sender_customer_id != null
              ? String(it.sender_customer_id)
              : undefined,
        recipientAbsId:
          it.receiver_abs_id != null
            ? String(it.receiver_abs_id)
            : it.receiver_customer_id != null
              ? String(it.receiver_customer_id)
              : undefined,
        clientAbsId:
          it.client_abs_id != null
            ? String(it.client_abs_id)
            : it.sender_customer_id != null
              ? String(it.sender_customer_id)
              : it.receiver_customer_id != null
                ? String(it.receiver_customer_id)
                : undefined,
        senderCustomerId:
          it.sender_customer_id != null
            ? String(it.sender_customer_id)
            : undefined,
        recipientCustomerId:
          it.receiver_customer_id != null
            ? String(it.receiver_customer_id)
            : undefined,
        externalAddress:
          typeof it.external_address === "string"
            ? it.external_address
            : typeof it.externalAddress === "string"
              ? it.externalAddress
              : undefined,
        networkFeeAmount: toNumberOrZero(it.network_fee_amount),
        networkFeeAsset:
          typeof it.network_fee_asset === "string"
            ? it.network_fee_asset
            : undefined,
        energyUsed: toNumberOrZero(it.energy_used),
        bandwidthUsed: toNumberOrZero(it.bandwidth_used),
        bricsBurnedAmount: toNumberOrZero(it.brics_burned_amount),
      }) as Transaction,
  );
  return {
    items,
    total: data.total ?? items.length,
    offset: data.offset ?? 0,
    limit: data.limit ?? items.length,
  };
}

export async function getStatsToday(): Promise<{
  total: number;
  bank: number;
  wallet: number;
  users: number;
  successful: number;
  dateFrom?: string;
  dateTo?: string;
}> {
  const res = await fetch(`/api/transactions/stats/today`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load stats");
  const d = await res.json();
  function num(v: any): number {
    if (typeof v === "number") return v;
    if (v && typeof v === "object") {
      if (typeof v.value === "number") return v.value;
      const vs = Object.values(v).filter(
        (x) => typeof x === "number",
      ) as number[];
      if (vs.length) return vs.reduce((a, b) => a + b, 0);
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return {
    total: num(d.total_amount_som),
    bank: num(d.bank_to_bank_som),
    wallet: num(d.wallet_to_wallet_som),
    users: Number(d.users_count ?? 0),
    successful: Number(d.successful_count ?? 0),
    dateFrom: typeof d.date_from === "string" ? d.date_from : undefined,
    dateTo: typeof d.date_to === "string" ? d.date_to : undefined,
  };
}

export async function getUsers(params: {
  offset?: number;
  limit?: number;
  search?: string;
  statuses?: ("ACTIVE" | "BLOCKED" | "FRAUD")[];
  sortBy?:
    | "customer_id"
    | "fio"
    | "phone"
    | "email"
    | "status"
    | "som_balance"
    | "total_balance"
    | "createdAt"
    | "last_login_at";
  sortDir?: "asc" | "desc";
}): Promise<{ items: User[]; total: number; offset: number; limit: number }> {
  const q = new URLSearchParams();
  if (params.offset != null) q.set("offset", String(params.offset));
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.search) q.set("search", params.search);

  if (params.statuses && params.statuses.length)
    for (const s of params.statuses) q.append("status", s);
  if (params.sortBy) q.set("sort_by", params.sortBy);
  if (params.sortDir) q.set("sort_dir", params.sortDir);
  const res = await fetch(`/api/user-management?${q.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load users");
  const data = await res.json();
  const items: User[] = (data.items || []).map((u: any) => ({
    id: String(u.customer_id ?? u.id ?? u.userId ?? ""),
    absClientId: String(u.customer_id ?? u.id ?? u.userId ?? ""),
    fullName: [
      u.last_name ?? u.lastName,
      u.first_name ?? u.firstName,
      u.middle_name ?? u.middleName,
    ]
      .filter(Boolean)
      .join(" "),
    phone: u.phone || "",
    email: u.email || "",
    status:
      u.status === "BLOCKED" || u.status === "Заблокирован"
        ? "Заблокирован"
        : u.status === "FRAUD"
          ? "Фин контроль"
          : "Активен",
    statusComment:
      typeof u.status_comment === "string" ? u.status_comment : undefined,
    tariffCategory: (u.tariff_category ||
      u.tariffCategory ||
      "K1") as TariffCategory,
    residency: (u.residency || "RESIDENT") as CustomerResidency,
    balances: {
      COM: Number(u.balances?.SOM ?? u.balances?.COM ?? 0),
      SALAM: Number(u.balances?.ESOM ?? u.balances?.SALAM ?? 0),
      USDT: Number(u.balances?.USDT_TRC20 ?? u.balances?.USDT ?? 0),
    },
    createdAt: u.createdAt || new Date().toISOString(),
    lastLoginAt: u.last_login_at || undefined,
    lastLoginIp: u.last_login_ip || undefined,
    lastLoginDevice: u.last_login_device || undefined,
  }));
  return {
    items,
    total: data.total ?? items.length,
    offset: data.offset ?? 0,
    limit: data.limit ?? items.length,
  };
}

export async function getUserById(id: string | number): Promise<User> {
  const res = await fetch(`/api/user-management/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load user");
  const u = await res.json();
  const user: User = {
    id: String(u.customer_id ?? u.id ?? u.userId ?? id),
    absClientId: String(u.customer_id ?? u.id ?? u.userId ?? id),
    fullName: [
      u.last_name ?? u.lastName,
      u.first_name ?? u.firstName,
      u.middle_name ?? u.middleName,
    ]
      .filter(Boolean)
      .join(" "),
    phone: u.phone || "",
    email: u.email || "",
    status:
      u.status === "BLOCKED" || u.status === "Заблокирован"
        ? "Заблокирован"
        : u.status === "FRAUD"
          ? "Фин контроль"
          : "Активен",
    statusComment:
      typeof u.status_comment === "string" ? u.status_comment : undefined,
    tariffCategory: (u.tariff_category ||
      u.tariffCategory ||
      "K1") as TariffCategory,
    residency: (u.residency || "RESIDENT") as CustomerResidency,
    balances: {
      COM: Number(u.balances?.SOM ?? u.balances?.COM ?? 0),
      SALAM: Number(u.balances?.ESOM ?? u.balances?.SALAM ?? 0),
      USDT: Number(u.balances?.USDT_TRC20 ?? u.balances?.USDT ?? 0),
    },
    createdAt: u.createdAt || new Date().toISOString(),
    lastLoginAt: u.last_login_at || undefined,
    lastLoginIp: u.last_login_ip || undefined,
    lastLoginDevice: u.last_login_device || undefined,
  };
  return user;
}

export async function createUser(payload: {
  firstName: string;
  lastName: string;
  middleName?: string;
  phone: string;
  email: string;
  status: "Активен" | "Заблокирован" | "Фин контроль";
}) {
  const body = {
    first_name: payload.firstName,
    last_name: payload.lastName,
    middle_name: payload.middleName || "",
    phone: payload.phone,
    email: payload.email,
    status:
      payload.status === "Заблокирован"
        ? "BLOCKED"
        : payload.status === "Фин контроль"
          ? "FRAUD"
          : "ACTIVE",
  };
  const res = await fetch(`/api/user-management`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to create user");
  return res.json();
}

export async function updateUser(
  id: string | number,
  payload: Partial<{
    status: "Активен" | "Заблокирован" | "Фин контроль";
    statusComment?: string;
    tariffCategory: TariffCategory;
    residency: CustomerResidency;
  }>,
) {
  const body: any = {
    ...(payload.status != null ? { status: payload.status } : {}),
    ...(payload.statusComment != null
      ? { status_comment: payload.statusComment }
      : {}),
    ...(payload.tariffCategory != null
      ? { tariff_category: payload.tariffCategory }
      : {}),
    ...(payload.residency != null ? { residency: payload.residency } : {}),
  };
  if (body.status)
    body.status =
      body.status === "Заблокирован"
        ? "BLOCKED"
        : body.status === "Фин контроль"
          ? "FRAUD"
          : "ACTIVE";
  const res = await fetch(`/api/user-management/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as any;
    const message = Array.isArray(data?.message)
      ? data.message.join("; ")
      : data?.message || "Failed to update user";
    throw new Error(message);
  }
  return res.json();
}

export async function deleteUser(id: string | number) {
  const res = await fetch(`/api/user-management/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete user");
  return true;
}

function roleLabelFromKey(k?: string): string {
  switch ((k || "").toUpperCase()) {
    case "SUPER_ADMIN":
      return "Супер админ";
    case "SKK":
      return "СКК";
    case "UDBO":
      return "УДБО";
    case "UBUIO":
      return "УБУИО";
    case "TREASURY":
      return "Казначейство";
    case "UIT":
      return "УИТ";
    default:
      return k || "Супер админ";
  }
}
function roleKeyFromLabel(lbl: string): string {
  const x = lbl.trim().toLowerCase();
  if (x === "супер админ") return "SUPER_ADMIN";
  if (x === "скк") return "SKK";
  if (x === "удбо") return "UDBO";
  if (x === "убуио") return "UBUIO";
  if (x === "казначейство") return "TREASURY";
  if (x === "уит") return "UIT";
  return lbl;
}

export async function getCurrentAdminRole(): Promise<string> {
  const res = await fetch(`/api/admin-management/me`, { cache: "no-store" });
  if (!res.ok) return "SUPER_ADMIN";
  const data = await res.json().catch(() => ({}) as any);
  const role = (data && (data.role || data?.data?.role)) || "SUPER_ADMIN";
  return String(role);
}

export async function getAdmins(params: {
  offset?: number;
  limit?: number;
  firstNameQuery?: string;
  lastNameQuery?: string;
  emailQuery?: string;
  roles?: string[];
  createdFrom?: string;
  createdTo?: string;
  sortFirstName?: "asc" | "desc";
  sortLastName?: "asc" | "desc";
  sortEmail?: "asc" | "desc";
  sortCreatedAt?: "asc" | "desc";
}): Promise<{ items: Admin[]; total: number; offset: number; limit: number }> {
  const q = new URLSearchParams();
  if (params.offset != null) q.set("offset", String(params.offset));
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.firstNameQuery) q.set("firstNameQuery", params.firstNameQuery);

  if (params.lastNameQuery) q.set("lastNameQuery", params.lastNameQuery);
  if (params.emailQuery) q.set("emailQuery", params.emailQuery);
  if (params.roles && params.roles.length)
    for (const r of params.roles) q.append("roles", r);
  if (params.createdFrom) q.set("createdFrom", params.createdFrom);
  if (params.createdTo) q.set("createdTo", params.createdTo);
  if (params.sortFirstName) q.set("sortFirstName", params.sortFirstName);
  if (params.sortLastName) q.set("sortLastName", params.sortLastName);
  if (params.sortEmail) q.set("sortEmail", params.sortEmail);
  if (params.sortCreatedAt) q.set("sortCreatedAt", params.sortCreatedAt);

  const res = await fetch(`/api/admin-management?${q.toString()}`, {
    cache: "no-store",
  });
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
  return {
    items,
    total: data.total ?? items.length,
    offset: data.offset ?? 0,
    limit: data.limit ?? items.length,
  };
}

export async function createAdmin(payload: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}) {
  const body = { ...payload, role: roleKeyFromLabel(payload.role) };
  const res = await fetch(`/api/admin-management`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to create admin");
  return res.json();
}

export async function updateAdmin(
  id: string | number,
  payload: Partial<{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
  }>,
) {
  const body = { ...payload } as any;
  if (body.role) body.role = roleKeyFromLabel(body.role);
  const res = await fetch(`/api/admin-management/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update admin");
  return res.json();
}

export async function deleteAdmin(id: string | number) {
  const res = await fetch(`/api/admin-management/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete admin");
  return true;
}

export async function getTransactionsStats(params: {
  dateFrom?: string;
  dateTo?: string;
  statuses?: TransactionStatus[];
  currencies?: string[];
  operations?: ("bank" | "crypto" | "exchange")[];
  metric?: "sum" | "count";
  bucket?: "day" | "week" | "month";
}): Promise<{
  points: { ts: number; label: string; value: number }[];
  totalSum: number;
  totalCount: number;
  topCurrencyBySumLabel: string;
  topCurrencyByCountLabel: string;
  mostActiveDayLabel: string;
  averageCheck: number;
}> {
  const opMap: Record<string, string> = {
    bank: "BANK_TO_BANK",
    crypto: "WALLET_TO_WALLET",
    exchange: "CONVERSION",
  };
  const q = new URLSearchParams();
  if (params.dateFrom) q.set("date_from", params.dateFrom);
  if (params.dateTo) q.set("date_to", params.dateTo);
  if (params.statuses && params.statuses.length)
    for (const s of params.statuses)
      q.append("status", mapUiStatusToBackend(s));
  if (params.currencies && params.currencies.length)
    for (const c of params.currencies)
      q.append("asset", mapDisplayToAssetDisplayHelper(c));
  if (params.operations && params.operations.length)
    for (const o of params.operations) q.append("kind", opMap[o] || o);
  if (params.metric) q.set("metric", params.metric);
  if (params.bucket) q.set("group_by", params.bucket);
  const res = await fetch(`/api/transactions/stats?${q.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load transactions stats");
  const d = await res.json();
  const series = Array.isArray(d.series) ? d.series : [];
  const summary = d.summary || {};
  const points = series.map((p: any) => {
    const iso = String(p.date);
    const ts = Date.parse(iso);
    const label = isNaN(ts)
      ? String(p.date)
      : new Date(iso).toISOString().slice(0, 10).split("-").reverse().join(".");
    return { ts: isNaN(ts) ? 0 : ts, label, value: Number(p.value ?? 0) };
  });
  const mapCurrencyToDisplay = (x?: string) => {
    const display = mapCurrency(x);
    if (display === "COM") return "СОМ";
    if (display === "SALAM" || display === "САЛАМ" || display === "Салам")
      return "Салам";
    return display;
  };
  const totalSum = Number(summary.total_sum_som ?? 0);
  const totalCount = Number(summary.total_count ?? 0);
  const topCurrencyBySumLabel = mapCurrencyToDisplay(
    summary.top_currency_by_sum,
  );
  const topCurrencyByCountLabel = mapCurrencyToDisplay(
    summary.top_currency_by_count,
  );
  const mostActiveDayLabel =
    typeof summary.most_active_day === "string" && summary.most_active_day
      ? summary.most_active_day.slice(0, 10).split("-").reverse().join(".")
      : "—";
  const averageCheck = Number(summary.average_check_som ?? 0);
  return {
    points,
    totalSum,
    totalCount,
    topCurrencyBySumLabel,
    topCurrencyByCountLabel,
    mostActiveDayLabel,
    averageCheck,
  };
}

export async function getSettings(): Promise<Record<string, string>> {
  const res = await fetch(`/api/blockchain-config/settings`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load settings");
  return res.json();
}

export async function putSettings(payload: Record<string, string>) {
  const res = await fetch(`/api/blockchain-config/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      body
        ? `Failed to save settings: ${body}`
        : `Failed to save settings (HTTP ${res.status})`,
    );
  }
  return res.json();
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const res = await fetch(`/api/blockchain-config/admin-settings`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await readErrorBody(res);
    throw new Error(
      body
        ? `Failed to load admin settings: ${body}`
        : `Failed to load admin settings (HTTP ${res.status})`,
    );
  }
  return res.json();
}

export async function putAdminSettings(
  payload: Partial<AdminSettings> & { comment?: string },
): Promise<AdminSettings> {
  const res = await fetch(`/api/blockchain-config/admin-settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      body
        ? `Failed to save admin settings: ${body}`
        : `Failed to save admin settings (HTTP ${res.status})`,
    );
  }
  return res.json();
}

export async function getReserves(): Promise<TreasuryReserves> {
  const res = await fetch(`/api/blockchain-config/reserves`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load reserves");
  const data = await res.json();
  return {
    treasuryAddress: String(data.treasury_address || ""),
    usdtBalance: Number(data.usdt_balance ?? 0),
    salamBalance: Number(data.salam_balance ?? 0),
    salamSpentToday: Number(data.salam_spent_today ?? 0),
    salamSpentTotal: Number(data.salam_spent_total ?? 0),
    bricsBalance: Number(data.brics_balance ?? 0),
    trxBalance: Number(data.trx_balance ?? 0),
    energyAvailable: Number(data.energy_available ?? 0),
    bandwidthAvailable: Number(data.bandwidth_available ?? 0),
    energySpentToday: Number(data.energy_spent_today ?? 0),
    energySpentTotal: Number(data.energy_spent_total ?? 0),
    bandwidthSpentToday: Number(data.bandwidth_spent_today ?? 0),
    bandwidthSpentTotal: Number(data.bandwidth_spent_total ?? 0),
    networkFeeTrxToday: Number(data.network_fee_trx_today ?? 0),
    networkFeeTrxTotal: Number(data.network_fee_trx_total ?? 0),
    bricsBurnedToday: Number(data.brics_burned_today ?? 0),
    bricsBurnedTotal: Number(data.brics_burned_total ?? 0),
  };
}

export async function getBankCommissionBalances(): Promise<BankCommissionBalances> {
  const res = await fetch(`/api/blockchain-config/bank-commission-balances`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load bank commission balances");
  return res.json();
}

function mapAssetToDisplay(x?: string): string {
  switch (x) {
    case "SOM":
      return "COM";
    case "ESOM":
      return "Салам";
    case "USDT_TRC20":
      return "USDT TRC20";
    default:
      return x || "COM";
  }
}
function mapDisplayToAssetDisplayHelper(x?: string): string {
  switch (x) {
    case "COM":
      return "SOM";
    case "Салам":
    case "SALAM":
    case "САЛАМ":
      return "ESOM";
    case "USDT":
    case "USDT TRC20":
      return "USDT_TRC20";
    default:
      return x || "SOM";
  }
}

export type AntiFraudRule = {
  id: number;
  category: TariffCategory;
  key: string;
  enabled: boolean;
  period_days?: any;
  threshold_som?: any;
  min_count?: any;
  percent_threshold?: any;
  updatedAt: string;
};
export type AntiFraudRuleUpdate = Partial<{
  enabled: boolean;
  period_days: any;
  threshold_som: any;
  min_count: any;
  percent_threshold: any;
  comment: string;
}>;

export async function getAntifraudRules(
  category: TariffCategory = "K1",
): Promise<AntiFraudRule[]> {
  const q = new URLSearchParams();
  if (category) q.set("category", category);
  const res = await fetch(`/api/antifraud/rules?${q.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load antifraud rules");
  return res.json();
}
export async function updateAntifraudRule(
  key: string,
  payload: AntiFraudRuleUpdate,
  category: TariffCategory = "K1",
): Promise<AntiFraudRule> {
  const q = new URLSearchParams();
  if (category) q.set("category", category);
  const res = await fetch(
    `/api/antifraud/rules/${encodeURIComponent(key)}?${q.toString()}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      body.trim()
        ? `Failed to update antifraud rule: ${body.trim()}`
        : `Failed to update antifraud rule (HTTP ${res.status})`,
    );
  }
  return res.json();
}

export type AntiFraudCaseStatus = "OPEN" | "APPROVED" | "REJECTED";
export type AntiFraudCaseItem = {
  id: string;
  status: AntiFraudCaseStatus;
  createdAt: string;
  amount: number;
  currency: string;
  sender: string;
  recipient: string;
  txId?: string;
  txHash?: string;
  ruleKey?: string;
  reason?: any;
};
export async function getAntifraudCases(params: {
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
  currencies?: string[];
  operations?: string[];
  caseStatus?: AntiFraudCaseStatus;
  caseStatuses?: AntiFraudCaseStatus[];
}): Promise<{
  items: AntiFraudCaseItem[];
  total: number;
  offset: number;
  limit: number;
}> {
  const unwrapListResponse = (raw: any) => {
    const root = raw?.data && typeof raw.data === "object" ? raw.data : raw;
    return {
      items: Array.isArray(root?.items) ? root.items : [],
      total: Number(root?.total ?? 0),
      offset: Number(root?.offset ?? 0),
      limit: Number(root?.limit ?? 0),
    };
  };

  const buildQuery = (
    singleStatus?: AntiFraudCaseStatus,
    offsetOverride?: number,
    limitOverride?: number,
  ) => {
    const q = new URLSearchParams();
    const offset = offsetOverride ?? params.offset;
    const limit = limitOverride ?? params.limit;
    if (offset != null) q.set("offset", String(offset));
    if (limit != null) q.set("limit", String(limit));
    if (params.sortBy) q.set("sort_by", params.sortBy);
    if (params.sortDir) q.set("sort_dir", params.sortDir);
    if (params.id) q.set("id", params.id);
    if (params.txHash) q.set("tx_hash", params.txHash);
    if (params.sender) q.set("sender", params.sender);
    if (params.receiver) q.set("receiver", params.receiver);
    if (params.dateFrom) q.set("date_from", params.dateFrom);
    if (params.dateTo) q.set("date_to", params.dateTo);
    if (typeof params.minAmount === "number")
      q.set("amount_min", String(params.minAmount));
    if (typeof params.maxAmount === "number")
      q.set("amount_max", String(params.maxAmount));
    if (params.currencies && params.currencies.length) {
      for (const c of params.currencies)
        q.append("asset", mapDisplayToAssetDisplayHelper(c));
    }
    if (params.operations && params.operations.length) {
      for (const o of params.operations) q.append("kind", o);
    }
    if (singleStatus) {
      q.set("case_status", singleStatus);
    } else if (params.caseStatus) {
      q.set("case_status", params.caseStatus);
    }
    return q;
  };

  const mapCase = (it: any): AntiFraudCaseItem => {
    const tx = it.transaction || {};
    const asNumber = (v: any): number | null => {
      if (v == null || v === "") return null;
      if (typeof v === "number") return Number.isFinite(v) ? v : null;
      if (typeof v === "string") {
        const normalized = v.replace(/\s+/g, "").replace(",", ".");
        const n = Number(normalized);
        return Number.isFinite(n) ? n : null;
      }
      if (typeof v === "object") {
        const nested =
          (v as any).value ??
          (v as any).amount ??
          (v as any).decimal ??
          (v as any).$numberDecimal ??
          (v as any).$numberLong;
        if (nested != null) return asNumber(nested);
      }
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const senderLabel = tx.sender_customer
      ? [tx.sender_customer.last_name, tx.sender_customer.first_name]
          .filter(Boolean)
          .join(" ")
      : tx.sender_wallet_address || "—";
    const receiverLabel = tx.receiver_customer
      ? [tx.receiver_customer.last_name, tx.receiver_customer.first_name]
          .filter(Boolean)
          .join(" ")
      : tx.receiver_wallet_address || "—";
    const amountValue =
      asNumber(tx.amount) ??
      asNumber(tx.amount_out) ??
      asNumber(tx.amount_in) ??
      asNumber(it.amount) ??
      asNumber(it.amount_out) ??
      asNumber(it.amount_in) ??
      0;
    const assetValue =
      tx.asset ??
      tx.asset_out ??
      tx.asset_in ??
      it.asset ??
      it.asset_out ??
      it.asset_in;
    return {
      id: String(it.id),
      status: (it.status || it.case_status || "OPEN") as AntiFraudCaseStatus,
      createdAt: tx.createdAt || it.createdAt,
      amount: amountValue,
      currency: mapAssetToDisplay(assetValue),
      sender: senderLabel,
      recipient: receiverLabel,
      txId: String(tx.id || ""),
      txHash: tx.tx_hash,
      ruleKey: it.rule_key,
      reason: it.reason,
    };
  };

  const requestedStatuses =
    params.caseStatuses && params.caseStatuses.length
      ? Array.from(new Set(params.caseStatuses))
      : params.caseStatus
        ? [params.caseStatus]
        : (["OPEN", "APPROVED", "REJECTED"] as AntiFraudCaseStatus[]);

  if (requestedStatuses.length === 1) {
    const q = buildQuery(requestedStatuses[0]);
    const res = await fetch(`/api/antifraud/cases?${q.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to load antifraud cases");
    const parsed = unwrapListResponse(await res.json());
    const items: AntiFraudCaseItem[] = parsed.items.map(mapCase);
    return {
      items,
      total: parsed.total || items.length,
      offset: Number.isFinite(parsed.offset) ? parsed.offset : 0,
      limit:
        Number.isFinite(parsed.limit) && parsed.limit > 0
          ? parsed.limit
          : items.length,
    };
  }

  const offset = params.offset ?? 0;
  const limit = params.limit ?? 20;
  const perStatusLimit = offset + limit;

  const responses: any[] = [];
  const errors: string[] = [];
  for (const status of requestedStatuses) {
    const q = buildQuery(status, 0, perStatusLimit);
    const res = await fetch(`/api/antifraud/cases?${q.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      errors.push(`status=${status}, http=${res.status}, body=${body}`);
      continue;
    }
    responses.push(unwrapListResponse(await res.json()));
  }

  if (!responses.length) {
    throw new Error(`Failed to load antifraud cases. ${errors.join(" | ")}`);
  }

  const byId = new Map<string, AntiFraudCaseItem>();
  let total = 0;
  for (const data of responses) {
    total += Number(data?.total ?? 0);
    for (const raw of data?.items || []) {
      const item = mapCase(raw);
      byId.set(item.id, item);
    }
  }
  const allItems = Array.from(byId.values());
  allItems.sort((a, b) => {
    const dir = (params.sortDir || "desc") === "asc" ? 1 : -1;
    const key = params.sortBy || "createdAt";
    if (key === "amount") return (a.amount - b.amount) * dir;
    if (key === "status") return a.status.localeCompare(b.status) * dir;
    const ta = Date.parse(a.createdAt || "");
    const tb = Date.parse(b.createdAt || "");
    const va = Number.isFinite(ta) ? ta : 0;
    const vb = Number.isFinite(tb) ? tb : 0;
    return (va - vb) * dir;
  });

  const items = allItems.slice(offset, offset + limit);
  return { items, total, offset, limit };
}

export async function getTariffs(): Promise<TariffSetting[]> {
  const res = await fetch(`/api/blockchain-config/tariffs`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await readErrorBody(res);
    throw new Error(
      body
        ? `Failed to load tariffs: ${body}`
        : `Failed to load tariffs (HTTP ${res.status})`,
    );
  }
  return res.json();
}

export type AdminActionLog = {
  id: number;
  admin_id: number;
  ip: string;
  action: string;
  details: any | null;
  createdAt: string;
};

export async function getAdminActionLogs(params: {
  offset?: number;
  limit?: number;
  adminId?: number | string;
  actionQuery?: string;
  sortBy?: "createdAt" | "admin_id" | "action";
  sortDir?: "asc" | "desc";
  createdFrom?: string;
  createdTo?: string;
}): Promise<{
  items: AdminActionLog[];
  total: number;
  offset: number;
  limit: number;
}> {
  const q = new URLSearchParams();
  if (params.offset != null) q.set("offset", String(params.offset));
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.adminId != null && String(params.adminId).trim())
    q.set("admin_id", String(params.adminId).trim());
  if (params.actionQuery) q.set("action_query", params.actionQuery);
  if (params.sortBy) q.set("sort_by", params.sortBy);
  if (params.sortDir) q.set("sort_dir", params.sortDir);
  if (params.createdFrom) q.set("created_from", params.createdFrom);
  if (params.createdTo) q.set("created_to", params.createdTo);

  const res = await fetch(`/api/audit/admin-actions?${q.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load admin action logs");
  const data = await res.json();
  const items: AdminActionLog[] = (data.items || []).map((x: any) => ({
    id: Number(x.id),
    admin_id: Number(x.admin_id),
    ip: String(x.ip || ""),
    action: String(x.action || ""),
    details: x.details ?? null,
    createdAt: String(x.createdAt || new Date().toISOString()),
  }));
  return {
    items,
    total: Number(data.total ?? items.length),
    offset: Number(data.offset ?? 0),
    limit: Number(data.limit ?? items.length),
  };
}

export async function putTariffs(
  items: TariffSetting[],
): Promise<TariffSetting[]> {
  const res = await fetch(`/api/blockchain-config/tariffs`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      body
        ? `Failed to save tariffs: ${body}`
        : `Failed to save tariffs (HTTP ${res.status})`,
    );
  }
  return res.json();
}

export async function approveAntifraudCase(id: string | number) {
  const res = await fetch(`/api/antifraud/cases/${id}/approve`, {
    method: "PATCH",
  });
  if (!res.ok) throw new Error("Failed to approve case");
  return res.json();
}
export async function rejectAntifraudCase(id: string | number) {
  const res = await fetch(`/api/antifraud/cases/${id}/reject`, {
    method: "PATCH",
  });
  if (!res.ok) throw new Error("Failed to reject case");
  return res.json();
}

export async function getSupportTickets(params?: {
  status?: SupportTicketStatus;
  offset?: number;
  limit?: number;
}): Promise<{
  items: SupportTicket[];
  total: number;
  offset: number;
  limit: number;
}> {
  const q = new URLSearchParams();
  q.set("status", params?.status || "OPEN");
  if (params?.offset != null) q.set("offset", String(params.offset));
  if (params?.limit != null) q.set("limit", String(params.limit));

  const res = await fetch(`/api/support/tickets?${q.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load support tickets");
  const data = await res.json().catch(() => ({}) as any);
  const rawItems = Array.isArray(data?.items) ? data.items : [];

  const items: SupportTicket[] = rawItems.map((item: any) => ({
    id: Number(item.id),
    customerId: Number(item.customer_id),
    customerName: item.customer_name ? String(item.customer_name) : null,
    status: (item.status || "OPEN") as SupportTicketStatus,
    createdAt: new Date(Number(item.created_at || 0)).toISOString(),
    lastMessageAt: new Date(Number(item.last_message_at || 0)).toISOString(),
    closedAt:
      item.closed_at != null
        ? new Date(Number(item.closed_at)).toISOString()
        : null,
  }));

  return {
    items,
    total: Number(data?.total ?? items.length),
    offset: Number(data?.offset ?? 0),
    limit: Number(data?.limit ?? items.length),
  };
}

export async function getSupportTicketMessages(
  ticketId: number,
): Promise<SupportMessage[]> {
  const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load support ticket messages");
  const data = await res.json().catch(() => []);
  const rawItems = Array.isArray(data) ? data : [];

  return rawItems.map((item: any) => ({
    id: Number(item.id),
    ticketId: Number(item.ticket_id),
    role: (item.role || "USER") as SupportMessage["role"],
    text: String(item.text || ""),
    createdAt: new Date(Number(item.created_at || 0)).toISOString(),
  }));
}

export async function replySupportTicket(
  ticketId: number,
  text: string,
): Promise<SupportMessage> {
  const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("Failed to reply support ticket");
  const item = await res.json();
  return {
    id: Number(item.id),
    ticketId: Number(item.ticket_id),
    role: (item.role || "ADMIN") as SupportMessage["role"],
    text: String(item.text || ""),
    createdAt: new Date(Number(item.created_at || 0)).toISOString(),
  };
}

export async function closeSupportTicket(
  ticketId: number,
): Promise<SupportTicket> {
  const res = await fetch(`/api/support/tickets/${ticketId}/close`, {
    method: "PATCH",
  });
  if (!res.ok) throw new Error("Failed to close support ticket");
  const item = await res.json();
  return {
    id: Number(item.id),
    customerId: Number(item.customer_id),
    customerName: item.customer_name ? String(item.customer_name) : null,
    status: (item.status || "CLOSED") as SupportTicketStatus,
    createdAt: new Date(Number(item.created_at || 0)).toISOString(),
    lastMessageAt: new Date(Number(item.last_message_at || 0)).toISOString(),
    closedAt:
      item.closed_at != null
        ? new Date(Number(item.closed_at)).toISOString()
        : null,
  };
}

export async function sendBroadcastPush(payload: {
  title: string;
  text: string;
  url?: string;
}): Promise<{
  successful: boolean;
  skipped?: boolean;
  sent?: number;
  failed?: number;
  details?: string[];
}> {
  const res = await fetch(`/api/notifications/push/broadcast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || "Не удалось отправить push-рассылку");
  }
  return {
    successful: Boolean(data?.successful),
    skipped: typeof data?.skipped === "boolean" ? data.skipped : undefined,
    sent: typeof data?.sent === "number" ? data.sent : undefined,
    failed: typeof data?.failed === "number" ? data.failed : undefined,
    details: Array.isArray(data?.details) ? data.details : undefined,
  };
}
