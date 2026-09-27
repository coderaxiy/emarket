// Money is a string ("125000.00"). Never do float math on it: sum in integer tiyin.

const moneyFormatters = new Map<string, Intl.NumberFormat>();

function moneyFormatter(intlLocale: string): Intl.NumberFormat {
  let formatter = moneyFormatters.get(intlLocale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency: 'UZS',
      maximumFractionDigits: 0,
    });
    moneyFormatters.set(intlLocale, formatter);
  }
  return formatter;
}

export function toTiyin(amount: string): number {
  return Math.round(Number.parseFloat(amount) * 100);
}

export function formatTiyin(tiyin: number, intlLocale: string): string {
  return moneyFormatter(intlLocale).format(tiyin / 100);
}

export function formatMoney(amount: string, intlLocale: string): string {
  return formatTiyin(toTiyin(amount), intlLocale);
}

/** Client-side sum before the server confirms a total. Prefer server totals when they exist. */
export function sumMoney(amounts: readonly string[]): number {
  return amounts.reduce((total, amount) => total + toTiyin(amount), 0);
}

export function formatDate(iso: string, intlLocale: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(intlLocale, options ?? { dateStyle: 'medium' }).format(new Date(iso));
}
