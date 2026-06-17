// Tipos del dominio B2B (Fase 1). Props de componentes y formas de datos del frontend
// van en types/ (CLAUDE.md). Los tipos derivados de GROQ irían en sanity/types/.

export type B2bClientType = 'reseller' | 'designer'

export type B2bDecision = 'approved' | 'review' | 'rejected'

export type B2bStatus = 'pending' | 'approved' | 'rejected' | 'more_info'

export interface B2bRegisterInput {
  clientType: B2bClientType
  country: string // ISO-2, ej. 'ES'
  legalCompanyName: string
  vatNumber: string
  companyWebsite?: string
  corporateEmail: string
  fiscalAddress: string
  password: string
}

// Señales parciales que producen los validadores.
export interface ValidationSignals {
  vatValid: boolean // VIES o Companies House válido
  vatServiceAvailable: boolean // false si el servicio externo no respondió
  corporateEmail: boolean
  websitePresent: boolean
  countryMatchesVat: boolean
  clientTypeDeclared: boolean
  countryVerifiable: boolean // true si el país es UE o UK (VIES/Companies House disponible)
}

export interface ScoreResult {
  score: number
  decision: B2bDecision
}

// Datos de empresa que se muestran (read-only) en el perfil de un cliente B2B.
export interface B2bCompanyInfo {
  companyName?: string
  vatNumber?: string
  country?: string
  clientType?: B2bClientType
  fiscalAddress?: string
  companyWebsite?: string
}
