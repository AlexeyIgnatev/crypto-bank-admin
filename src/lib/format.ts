export function formatAmount6(n: number): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  const truncated = (n >= 0 ? Math.trunc(n * 1e6) : Math.ceil(n * 1e6)) / 1e6;

  const s = Math.abs(truncated).toFixed(6);
  const [, fRaw] = s.split(".");
  const f = (fRaw || "").replace(/0+$/, "");
  const sign = truncated < 0 ? -1 : 1;
  const absVal = Math.abs(truncated);
  const fractionDigits = f.length;
  return (sign * absVal).toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatAmount2(n: number): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
