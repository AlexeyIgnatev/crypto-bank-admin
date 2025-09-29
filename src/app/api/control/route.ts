import { NextResponse } from "next/server";

export type ControlRule = {
  id: string;
  category: "Обязательный контроль" | "Поведение клиента";
  condition: string; // Признак / Условие
  threshold: string; // Порог / Период / Количество — редактируемое поле
};

let RULES: ControlRule[] = [
  {
    id: "req-1",
    category: "Обязательный контроль",
    condition: "(внесение, снятие, обмен) с фиата",
    threshold: "≥ 1 000 000 сом",
  },
  {
    id: "req-2",
    category: "Обязательный контроль",
    condition: "Разовая сделка",
    threshold: "≥ 2 800 000 сом",
  },
  {
    id: "beh-1",
    category: "Поведение клиента",
    condition: "Частые внесения/снятия",
    threshold: "≥ 3 операции за 30 дней, каждая ≥ 100 000 сом",
  },
  {
    id: "beh-2",
    category: "Поведение клиента",
    condition: "Вывод в фиат после крупного поступления",
    threshold: "≥ 50% от ≥ 1 000 000 сом в течение 7 дней",
  },
  {
    id: "beh-3",
    category: "Поведение клиента",
    condition: "Дробление сумм перевода с фиата",
    threshold: "Изменение баланса ≥ 1 000 000 сом за 14 дней",
  },
  {
    id: "beh-4",
    category: "Поведение клиента",
    condition: "Внесение третьими лицами на кошелёк",
    threshold: "≥ 3 внесения от разных лиц за 30 дней, общая сумма ≥ 1 000 000 сом",
  },
  {
    id: "beh-5",
    category: "Поведение клиента",
    condition: "Активность счёта",
    threshold: "После ≥ 6 месяцев неактивности",
  },
  {
    id: "beh-6",
    category: "Поведение клиента",
    condition: "Много переводов от разных физлиц на один счёт за месяц",
    threshold: "≥ 10 физлиц",
  },
];

export async function GET() {
  return NextResponse.json({ rules: RULES });
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, threshold } = body as { id?: string; threshold?: string };
    if (!id || typeof threshold !== "string") {
      return NextResponse.json({ error: "id and threshold are required" }, { status: 400 });
    }
    const idx = RULES.findIndex((r) => r.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "rule not found" }, { status: 404 });
    }
    RULES[idx] = { ...RULES[idx], threshold };
    return NextResponse.json({ ok: true, rule: RULES[idx] });
  } catch (e) {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
}
