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

export interface Filters {
  q: string; // tx id or name
  status: "all" | TransactionStatus;
  dateFrom?: string; // ISO
  dateTo?: string;   // ISO
  minAmount?: number;
  maxAmount?: number;
  currencies?: string[]; // e.g., ["USD","KGS"]
}
