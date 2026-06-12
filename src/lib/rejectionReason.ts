import { Transaction } from "@/types";

export function readableRejectionReason(transaction: Transaction): string {
  if (transaction.status !== "REJECTED" && transaction.status !== "FAILED") return "-";

  const source = (transaction.comment || "").trim();
  if (!source) return "Операция отклонена";

  const reason = source.match(/reason=(.+)$/i)?.[1]?.trim() || source;
  const lower = reason.toLowerCase();

  if (lower.includes("insufficient") || lower.includes("недостаточно")) {
    return "Недостаточно средств";
  }
  if (lower.includes("blocked") || lower.includes("заблок")) {
    return "Клиент заблокирован";
  }
  if (lower.includes("fraud") || lower.includes("anti-fraud") || lower.includes("финконтрол")) {
    return "Операция отклонена финконтролем";
  }
  if (lower.includes("permission denied") || lower.includes("api key permissions")) {
    return "Нет разрешения на выполнение операции";
  }
  if (lower.includes("minimum") || lower.includes("min=") || lower.includes("below minimum")) {
    return "Сумма меньше минимально допустимой";
  }
  if (lower.includes("recipient not found")) {
    return "Получатель не найден";
  }
  if (lower.includes("customer not found") || lower.includes("sender not found")) {
    return "Клиент не найден";
  }
  if (lower.includes("unsupported")) {
    return "Операция не поддерживается";
  }

  return reason;
}
