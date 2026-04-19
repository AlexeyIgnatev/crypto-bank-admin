export type TransactionStatus = "PENDING" | "SUCCESS" | "REJECTED" | "FAILED";

export interface Transaction {
  id: string; // short hash
  status: TransactionStatus;
  createdAt: string; // ISO string
  amount: number; // in minor units (e.g., cents) or plain number
  feeAmount?: number;
  currency: string; // e.g., KGS, USD
  sender: string;
  recipient: string;
  senderAbsId?: string;
  recipientAbsId?: string;
  clientAbsId?: string;
  comment?: string;
  senderCustomerId?: string;
  recipientCustomerId?: string;
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
  role: string; // e.g., "РЎСѓРїРµСЂ Р°РґРјРёРЅ", "РЎРљРљ", "РЈР”Р‘Рћ", "РЈР‘РЈРРћ", "РљР°Р·РЅР°С‡РµР№СЃС‚РІРѕ", "РЈРРў"
  createdAt: string; // ISO
}

export type UserStatus = "РђРєС‚РёРІРµРЅ" | "Р—Р°Р±Р»РѕРєРёСЂРѕРІР°РЅ" | "Р¤РёРЅ РєРѕРЅС‚СЂРѕР»СЊ";

export interface User {
  id: string;
  absClientId?: string;
  fullName: string;
  phone: string;
  email: string;
  status: UserStatus;
  balances: {
    COM: number;
    SALAM: number;
    BTC: number;
    ETH: number;
    USDT: number;
  };
  createdAt: string; // ISO
  lastLoginAt?: string; // ISO
  lastLoginIp?: string;
  lastLoginDevice?: string;
}

