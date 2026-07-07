export type TransactionStatus = "PENDING" | "SUCCESS" | "REJECTED" | "FAILED";

export interface Transaction {
  id: string;
  status: TransactionStatus;
  createdAt: string;
  amount: number;
  feeAmount?: number;
  currency: string;
  kind?: string;
  comment?: string;
  sender: string;
  recipient: string;
  senderAbsId?: string;
  recipientAbsId?: string;
  clientAbsId?: string;
  senderCustomerId?: string;
  recipientCustomerId?: string;
  externalAddress?: string;
  networkFeeAmount?: number;
  networkFeeAsset?: string;
  energyUsed?: number;
  bandwidthUsed?: number;
  bricsBurnedAmount?: number;
}

export type OperationType = "bank" | "crypto" | "exchange";

export interface Filters {
  q: string;
  statuses?: TransactionStatus[];
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  currencies?: string[];
  operations?: OperationType[];
}

export interface Admin {
  id: string;
  firstName: string;
  lastName: string;
  login: string;
  role: string;
  createdAt: string;
}

export type UserStatus = "Активен" | "Заблокирован" | "Фин контроль";
export type TariffCategory = "K1" | "K2" | "K3" | "K4" | "K5" | "K6";
export type CustomerResidency = "RESIDENT" | "NON_RESIDENT";

export interface User {
  id: string;
  absClientId?: string;
  fullName: string;
  phone: string;
  email: string;
  status: UserStatus;
  tariffCategory: TariffCategory;
  residency: CustomerResidency;
  balances: {
    COM: number;
    SALAM: number;
    USDT: number;
  };
  createdAt: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
  lastLoginDevice?: string;
}

export interface TreasuryReserves {
  treasuryAddress: string;
  usdtBalance: number;
  salamBalance: number;
  salamSpentToday: number;
  salamSpentTotal: number;
  bricsBalance: number;
  trxBalance: number;
  energyAvailable: number;
  bandwidthAvailable: number;
  energySpentToday: number;
  energySpentTotal: number;
  bandwidthSpentToday: number;
  bandwidthSpentTotal: number;
  networkFeeTrxToday: number;
  networkFeeTrxTotal: number;
  bricsBurnedToday: number;
  bricsBurnedTotal: number;
}

export type SupportTicketStatus = "OPEN" | "CLOSED";
export type SupportMessageRole = "USER" | "ASSISTANT" | "ADMIN";

export interface SupportTicket {
  id: number;
  customerId: number;
  status: SupportTicketStatus;
  createdAt: string;
  lastMessageAt: string;
  closedAt: string | null;
}

export interface SupportMessage {
  id: number;
  ticketId: number;
  role: SupportMessageRole;
  text: string;
  createdAt: string;
}
