export const CURRENCY_DEFINITIONS = {
  PLN: { code: 'PLN', view: 'zł' },
  USD: { code: 'USD', view: '$' },
  EUR: { code: 'EUR', view: '€' },
} as const

export type CurrencyCode = keyof typeof CURRENCY_DEFINITIONS

export const SUPPORTED_CURRENCY_CODES = ['PLN'] as const satisfies readonly CurrencyCode[]
export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCY_CODES)[number]

export const currencyOptions = SUPPORTED_CURRENCY_CODES.map((code) => CURRENCY_DEFINITIONS[code])

export const isCurrencyCode = (value: unknown): value is CurrencyCode => {
  return typeof value === 'string' && value in CURRENCY_DEFINITIONS
}

export const normalizeCurrencyCode = (value: unknown): CurrencyCode | null => {
  if (typeof value !== 'string') return null
  const upper = value.trim().toUpperCase()
  return isCurrencyCode(upper) ? upper : null
}

export const isSupportedCurrencyCode = (value: unknown): value is SupportedCurrencyCode => {
  const code = normalizeCurrencyCode(value)
  return code !== null && (SUPPORTED_CURRENCY_CODES as readonly string[]).includes(code)
}

export const currencyView = (code: unknown): string => {
  const normalized = normalizeCurrencyCode(code)
  return normalized ? CURRENCY_DEFINITIONS[normalized].view : String(code ?? '')
}

export const formatMoneyByView = (priceCents: number, currency: unknown): string => {
  const amount = (priceCents ?? 0) / 100
  const view = currencyView(currency)
  return `${amount.toFixed(2)} ${view}`.trim()
}

