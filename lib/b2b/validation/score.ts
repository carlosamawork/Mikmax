import type {ValidationSignals, ScoreResult, B2bDecision} from '@/types/b2b'

const POINTS = {
  vatValid: 40,
  corporateEmail: 20,
  websitePresent: 15,
  countryMatchesVat: 15,
  clientTypeDeclared: 10,
}

const APPROVE_AT = 85
const REVIEW_AT = 50

export function scoreApplication(signals: ValidationSignals): ScoreResult {
  let score = 0
  if (signals.vatValid) score += POINTS.vatValid
  if (signals.corporateEmail) score += POINTS.corporateEmail
  if (signals.websitePresent) score += POINTS.websitePresent
  if (signals.countryMatchesVat) score += POINTS.countryMatchesVat
  if (signals.clientTypeDeclared) score += POINTS.clientTypeDeclared

  let decision: B2bDecision = 'rejected'
  if (score >= APPROVE_AT) decision = 'approved'
  else if (score >= REVIEW_AT) decision = 'review'

  // País no verificable (fuera de UE+UK): no se puede validar el VAT, así que nunca
  // se auto-aprueba ni se auto-rechaza — siempre a revisión manual.
  if (!signals.countryVerifiable) decision = 'review'

  return {score, decision}
}
