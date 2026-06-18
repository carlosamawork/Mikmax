import type {Locale} from '@/lib/i18n/config'

export function formatMoney(
  money: {amount: string | number; currencyCode: string},
  locale: Locale,
): string {
  const value = typeof money.amount === 'string' ? parseFloat(money.amount) : money.amount
  return new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', {
    style: 'currency',
    currency: money.currencyCode,
  }).format(value)
}
