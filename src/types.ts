export type TransactionStatus = "confirmed" | "pending" | "declined";

export interface Transaction {
  id: string; // short hash
  status: TransactionStatus;
  createdAt: string; // ISO string
  amount: number; // in minor units (e.g., cents) or plain number
  currency: string; // e.g., KGS, USD
  sender: string;
  recipient: string;
}

export type OperationType = "bank" | "crypto" | "exchange";

export interface Filters {
  q: string; // tx id or name
  statuses?: TransactionStatus[]; // multi-select; empty/undefined = all
  dateFrom?: string; // ISO
  dateTo?: string;   // ISO
  minAmount?: number;
  maxAmount?: number;
  currencies?: string[]; // e.g., ["USDT","BTC"] etc.
  operations?: OperationType[];
}

// Admins
export interface Admin {
  id: string;
  firstName: string;
  lastName: string;
  login: string; // email or username
  role: "Супер админ"; // only one role for now
  createdAt: string; // ISO
}
