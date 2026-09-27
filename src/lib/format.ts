// Money is a string ("125000.00"). Never do float math on it: sum in integer tiyin.

// Money and whole numbers are formatted by hand, not with Intl: some browsers ship
// without Uzbek (or other) locale data and would print "UZS 15,000" where the server
// printed "15 000 soʻm", breaking hydration. Hand-made output is identical everywhere.

const NBSP = '\u00A0';

/** `uz-Latn-UZ` → `uz`. Unknown locales format like `en`. */
function language(intlLocale: string): string {
  return intlLocale.slice(0, 2);
}

/** Whole number with locale grouping: `1 250 000` (uz, ru) or `1,250,000` (en). */
export function formatNumber(value: number, intlLocale: string): string {
  const rounded = Math.round(value);
  const digits = Math.abs(rounded).toString();
  const separator = language(intlLocale) === 'en' ? ',' : NBSP;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return rounded < 0 ? `-${grouped}` : grouped;
}

const CURRENCY: Record<string, (amount: string) => string> = {
  uz: (amount) => `${amount}${NBSP}soʻm`,
  ru: (amount) => `${amount}${NBSP}сум`,
  en: (amount) => `${amount}${NBSP}UZS`,
};

export function toTiyin(amount: string): number {
  return Math.round(Number.parseFloat(amount) * 100);
}

/** Whole soʻm, e.g. `1 250 000 soʻm`. Tiyin are never shown (prices are whole soʻm in practice). */
export function formatTiyin(tiyin: number, intlLocale: string): string {
  const withCurrency = CURRENCY[language(intlLocale)] ?? CURRENCY.en!;
  return withCurrency(formatNumber(tiyin / 100, intlLocale));
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
