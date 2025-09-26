import { Transaction, TransactionStatus, Filters, OperationType, Admin, User, UserStatus } from "../types";
function randomAdminId() {
  return Math.random().toString(36).slice(2, 10);
}
export function generateAdmins(count = 75): Admin[] {
  const first = ["Арслан","Асан","Елена","Иван","Мария","Дмитрий","Жанна","Анна","Павел","Олег"]; 
  const last = ["Бекболотов","Иванов","Петров","Сидоров","Ким","Ахметов","Сергеев","Орлов","Смирнов","Фёдоров"]; 
  const out: Admin[] = [];
  for (let i = 0; i < count; i++) {
    const f = first[Math.floor(Math.random()*first.length)];
    const l = last[Math.floor(Math.random()*last.length)];
    const login = `${f.toLowerCase()}.${l.toLowerCase()}${i}@mail.com`;
    out.push({
      id: randomAdminId(),
      firstName: f,
      lastName: l,
      login,
      role: "Супер админ",
      createdAt: new Date(Date.now() - Math.random()*90*24*3600*1000).toISOString(),
    });
  }
  return out;
}

export function generateUsers(count = 300): User[] {
  const phones = ["+996 (555) 123 333", "+996 (700) 555 777", "+996 (770) 222 111", "+996 (555) 999 000"]; 
  const emails = ["user1@gmail.com","user2@gmail.com","user3@gmail.com","user4@gmail.com"]; 
  const fulls = [
    "Арслан Бекболотов Мамыткасычмович",
    "Асанов Асан Асанович",
    "Елена Иванова",
    "Алексей Петров",
    "Мария Сидорова",
    "Павел Смирнов",
  ];
  const arr: User[] = [];
  for (let i = 0; i < count; i++) {
    const fullName = fulls[Math.floor(Math.random()*fulls.length)];
    const phone = phones[Math.floor(Math.random()*phones.length)];
    const email = emails[Math.floor(Math.random()*emails.length)].replace("user", `user${i}`);
    const status: UserStatus = Math.random() > 0.2 ? "Активен" : "Заблокирован";
    const balances = {
      COM: Math.floor(Math.random()*1_000_00000)/100,
      SALAM: Math.floor(Math.random()*500_00000)/100,
      BTC: Math.floor(Math.random()*10_00000)/100,
      ETH: Math.floor(Math.random()*20_00000)/100,
      USDT: Math.floor(Math.random()*200_00000)/100,
    };
    arr.push({
      id: randomId(),
      fullName,
      phone,
      email,
      status,
      balances,
      createdAt: randomDateWithin(120),
    });
  }
  return arr;
}



const names = [
  "Арслан Бекболотов Мамыткысымович",
  "Асанов Асан Асанович",
  "Елена Иванова",
  "John Doe",
  "Jane Smith",
  "Алексей Петров",
  "Мария Сидорова",
];

// Expand currencies to include requested assets
const currencies = ["COM", "SALAM", "BTC", "USDT", "ETH"] as const;

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
  if (f.statuses && f.statuses.length > 0) {
    const set = new Set(f.statuses);
    res = res.filter((t) => set.has(t.status));
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
  if (f.operations && f.operations.length > 0) {
    // Mock logic: map operation types to subsets by currency for demo purposes
    const opMap: Record<OperationType, string[]> = {
      bank: ["COM", "SALAM"],
      crypto: ["BTC", "ETH", "USDT"],
      exchange: ["COM", "USDT", "USD"].filter(Boolean) as string[],
    };
    res = res.filter(t => f.operations!.some(op => opMap[op]?.includes(t.currency)));
  }
  return res;
}
