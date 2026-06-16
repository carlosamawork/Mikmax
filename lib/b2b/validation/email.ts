// Dominios de email genéricos (no corporativos). Ampliable.
const GENERIC_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'hotmail.com', 'hotmail.es', 'hotmail.co.uk',
  'yahoo.com', 'yahoo.es', 'yahoo.co.uk',
  'outlook.com', 'outlook.es', 'live.com', 'msn.com',
  'icloud.com', 'me.com',
  'aol.com', 'protonmail.com', 'gmx.com',
])

// True si el email tiene forma válida y su dominio NO es genérico.
export function isCorporateEmail(email: string): boolean {
  const cleaned = (email || '').trim().toLowerCase()
  const m = cleaned.match(/^[^@\s]+@([^@\s]+\.[^@\s]+)$/)
  if (!m) return false
  return !GENERIC_DOMAINS.has(m[1])
}
