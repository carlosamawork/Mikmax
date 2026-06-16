export interface CompaniesHouseResult {
  valid: boolean
  available: boolean // false → servicio no concluyente (no rechazar)
  name?: string
}

// El "company number" UK son los dígitos tras el prefijo GB (o el propio número).
function toCompanyNumber(vatNumber: string): string {
  return (vatNumber || '').replace(/\s/g, '').toUpperCase().replace(/^GB/, '')
}

// Companies House REST: Basic auth con la API key como usuario y password vacío.
export async function checkCompaniesHouse(vatNumber: string): Promise<CompaniesHouseResult> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY
  if (!apiKey) return {valid: false, available: false}

  const number = toCompanyNumber(vatNumber)
  const auth = Buffer.from(`${apiKey}:`).toString('base64')

  try {
    const res = await fetch(`https://api.company-information.service.gov.uk/company/${number}`, {
      headers: {Authorization: `Basic ${auth}`},
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (res.status === 404) return {valid: false, available: true}
    if (!res.ok) return {valid: false, available: false}
    const json = await res.json()
    const active = json?.company_status === 'active'
    return {valid: active, available: true, name: json?.company_name || undefined}
  } catch {
    return {valid: false, available: false}
  }
}
