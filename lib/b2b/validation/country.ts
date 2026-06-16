import {VAT_PREFIX_TO_COUNTRY} from './vatPrefixes'

// Extrae el prefijo de 2 letras del VAT (en mayúsculas), ignorando espacios.
export function parseVatPrefix(vatNumber: string): string | null {
  const cleaned = (vatNumber || '').replace(/\s/g, '').toUpperCase()
  const m = cleaned.match(/^([A-Z]{2})/)
  return m ? m[1] : null
}

// True si el prefijo del VAT mapea al país declarado.
export function countryMatchesVat(country: string, vatNumber: string): boolean {
  const prefix = parseVatPrefix(vatNumber)
  if (!prefix) return false
  const mapped = VAT_PREFIX_TO_COUNTRY[prefix]
  if (!mapped) return false
  return mapped === (country || '').toUpperCase()
}
