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
// Para países verificables: score mínimo para ir a revisión aunque no alcance REVIEW_AT.
// Permite que aplicaciones con señales de empresa (email + web + tipo) pero sin VAT válido
// no sean auto-rechazadas.
const VERIFIABLE_REVIEW_AT = 30

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

  // País verificable (UE+UK) con score entre VERIFIABLE_REVIEW_AT y REVIEW_AT: la falta
  // de VAT positivo no es concluyente cuando hay otras señales de empresa → revisión.
  if (signals.countryVerifiable && score >= VERIFIABLE_REVIEW_AT && score < REVIEW_AT)
    decision = 'review'

  // País no verificable (fuera de UE+UK): no se puede validar el VAT, así que nunca
  // se auto-aprueba ni se auto-rechaza — siempre a revisión manual.
  if (!signals.countryVerifiable) decision = 'review'

  return {score, decision}
}
