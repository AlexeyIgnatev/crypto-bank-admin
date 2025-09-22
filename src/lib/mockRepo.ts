import { Transaction, TransactionStatus, Filters } from "../types";

const names = [
  "Арслан Бекболотов Мамыткысымович",
  "Асанов Асан Асанович",
  "Елена Иванова",
  "John Doe",
  "Jane Smith",
  "Алексей Петров",
  "Мария Сидорова",
];

const currencies = ["KGS", "USD", "EUR"] as const;

function randomId() {
  const base = Math.random().toString(16).slice(2, 10) + Math.random().toString(16).slice(2, 10);
  return base.slice(0, 12);
}

function randomName() {
  return names[Math.floor(Math.random() * names.length)];
}

function randomAmount() {
  return Math.floor(Math.random() * 1_000_000_00) / 100;
}

function randomCurrency() {
  return currencies[Math.floor(Math.random() * currencies.length)];
}

function randomStatus(): TransactionStatus {
  const vals: TransactionStatus[] = ["confirmed", "pending", "declined"];
  return vals[Math.floor(Math.random() * vals.length)];
}

function randomDateWithin(days = 60) {
  const now = Date.now();
  const past = now - days * 24 * 60 * 60 * 1000;
  const ts = Math.floor(Math.random() * (now - past)) + past;
  return new Date(ts).toISOString();
}

export function generateTransactions(count = 250): Transaction[] {
  const arr: Transaction[] = [];
  for (let i = 0; i < count; i++) {
    const sender = randomName();
    let recipient = randomName();
    if (recipient === sender) recipient = randomName();
    arr.push({
      id: randomId(),
      status: randomStatus(),
      createdAt: randomDateWithin(120),
      amount: randomAmount(),
      currency: randomCurrency(),
      sender,
      recipient,
    });
  }
  return arr;
}

export function applyFilters(data: Transaction[], f: Filters): Transaction[] {
  let res = [...data];

  if (f.q) {
    const q = f.q.toLowerCase();
    res = res.filter((t) =>
      t.id.toLowerCase().includes(q) ||
      t.sender.toLowerCase().includes(q) ||
      t.recipient.toLowerCase().includes(q)
    );
  }
  if (f.status !== "all") {
    res = res.filter((t) => t.status === f.status);
  }
  if (f.dateFrom) {
    const d = new Date(f.dateFrom).getTime();
    res = res.filter((t) => new Date(t.createdAt).getTime() >= d);
  }
  if (f.dateTo) {
    const d = new Date(f.dateTo).getTime();
    res = res.filter((t) => new Date(t.createdAt).getTime() <= d);
  }
  if (typeof f.minAmount === "number") {
    res = res.filter((t) => t.amount >= f.minAmount!);
  }
  if (typeof f.maxAmount === "number") {
    res = res.filter((t) => t.amount <= f.maxAmount!);
  }
  if (f.currencies && f.currencies.length > 0) {
    res = res.filter((t) => f.currencies!.includes(t.currency));
  }
  return res;
}
