const whole = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });
const withKopecks = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", minimumFractionDigits: 2 });

/** API money is integer kopecks: 199900 → "1 999 ₽", 209820 → "2 098,20 ₽". */
export function formatMoney(kopecks: number): string {
  return (kopecks % 100 === 0 ? whole : withKopecks).format(kopecks / 100);
}

/** "1 999,50" / "1999.5" → 199950. Returns NaN for garbage. */
export function rublesToKopecks(input: string): number {
  const normalized = input.replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return NaN;
  return Math.round(Number(normalized) * 100);
}

export function kopecksToRubles(kopecks: number): string {
  return (kopecks / 100).toString().replace(".", ",");
}
