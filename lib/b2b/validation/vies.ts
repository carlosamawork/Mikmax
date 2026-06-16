import {parseVatPrefix} from './country'

export interface ViesResult {
  valid: boolean
  available: boolean // false → servicio no concluyente (no rechazar)
  name?: string
  address?: string
}

const VIES_URL = 'https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number'

// Comprueba un VAT intracomunitario en VIES. Nunca lanza: ante cualquier fallo
// devuelve {valid:false, available:false} para que el scoring lo trate como neutro.
export async function checkVies(vatNumber: string): Promise<ViesResult> {
  const prefix = parseVatPrefix(vatNumber)
  if (!prefix) return {valid: false, available: false}

  const number = (vatNumber || '').replace(/\s/g, '').toUpperCase().slice(prefix.length)

  try {
    const res = await fetch(VIES_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({countryCode: prefix, vatNumber: number}),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return {valid: false, available: false}
    const json = await res.json()
    return {
      valid: Boolean(json?.valid),
      available: true,
      name: json?.name || undefined,
      address: json?.address || undefined,
    }
  } catch {
    return {valid: false, available: false}
  }
}
