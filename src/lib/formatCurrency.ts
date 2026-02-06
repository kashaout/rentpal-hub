export type Currency = "NGN" | "GBP" | "USD";

const currencyFormats: Record<Currency, { symbol: string; locale: string }> = {
  NGN: { symbol: "₦", locale: "en-NG" },
  GBP: { symbol: "£", locale: "en-GB" },
  USD: { symbol: "$", locale: "en-US" },
};

export function formatCurrency(
  amount: number,
  currency: Currency = "NGN",
  compact: boolean = false
): string {
  const format = currencyFormats[currency] || currencyFormats.NGN;

  if (compact && Math.abs(amount) >= 1000000) {
    return `${format.symbol}${(amount / 1000000).toFixed(1)}M`;
  }
  if (compact && Math.abs(amount) >= 1000) {
    return `${format.symbol}${(amount / 1000).toFixed(1)}K`;
  }

  return new Intl.NumberFormat(format.locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number, compact: boolean = false): string {
  if (compact && Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (compact && Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-NG").format(value);
}
