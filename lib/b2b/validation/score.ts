import type {ValidationSignals, ScoreResult, B2bDecision} from '@/types/b2b'

// Rebalanceado al quitar clientTypeDeclared (+10): su peso se reparte en
// vatValid (+5) y corporateEmail (+5) para que las combinaciones que antes
// aprobaban con el tipo declarado sigan sumando 85.
const POINTS = {
  vatValid: 45,
  corporateEmail: 25,
  websitePresent: 15,
  countryMatchesVat: 15,
}

const APPROVE_AT = 85
const REVIEW_AT = 50

export function scoreApplication(signals: ValidationSignals): ScoreResult {
  let score = 0
  if (signals.vatValid) score += POINTS.vatValid
  if (signals.corporateEmail) score += POINTS.corporateEmail
  if (signals.websitePresent) score += POINTS.websitePresent
  if (signals.countryMatchesVat) score += POINTS.countryMatchesVat

  let decision: B2bDecision = 'rejected'
  if (score >= APPROVE_AT) decision = 'approved'
  else if (score >= REVIEW_AT) decision = 'review'

  // País no verificable (fuera de UE+UK): no se puede validar el VAT, así que nunca
  // se auto-aprueba ni se auto-rechaza — siempre a revisión manual.
  if (!signals.countryVerifiable) decision = 'review'

  return {score, decision}
}
