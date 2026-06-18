// Extracts the English value from an internationalized-array field for Studio previews.
// Accepts the raw selected value (array of {_key, value}) OR a plain string (pre-migration) OR undefined.
export function enText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    const en = value.find((v) => v && typeof v === 'object' && (v as {_key?: string})._key === 'en')
    const item = (en ?? value[0]) as {value?: unknown} | undefined
    if (item && typeof item.value === 'string') return item.value
  }
  return ''
}
