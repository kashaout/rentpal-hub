export type Currency = "NGN";

const currencyFormats: Record<Currency, { symbol: string; locale: string }> = {
  NGN: { symbol: "₦", locale: "en-NG" },
};

export function formatCurrency(
  amount: number,
  _currency: Currency | string = "NGN",
  compact: boolean = false
): string {
  const validCurrency = "NGN" as Currency;
  const format = currencyFormats[validCurrency] || currencyFormats.NGN;

  if (compact && Math.abs(amount) >= 1000000) {
    return `${format.symbol}${(amount / 1000000).toFixed(1)}M`;
  }
  if (compact && Math.abs(amount) >= 1000) {
    return `${format.symbol}${(amount / 1000).toFixed(1)}K`;
  }

  return new Intl.NumberFormat(format.locale, {
    style: "currency",
    currency: validCurrency,
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
