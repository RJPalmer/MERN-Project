export function formatMoney(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency })
  const fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 2
  return formatter.format(amount / 10 ** fractionDigits)
}
