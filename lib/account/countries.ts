// Lista de países para el selector de dirección + prefijo telefónico.
// Lista acotada a mercados principales — ampliable cuando haga falta.

export type Country = {
  name: string // nombre que Shopify espera en MailingAddress.country
  dial: string // prefijo telefónico
}

export const COUNTRIES: Country[] = [
  {name: 'Spain', dial: '+34'},
  {name: 'Portugal', dial: '+351'},
  {name: 'France', dial: '+33'},
  {name: 'Italy', dial: '+39'},
  {name: 'Germany', dial: '+49'},
  {name: 'United Kingdom', dial: '+44'},
  {name: 'Ireland', dial: '+353'},
  {name: 'Netherlands', dial: '+31'},
  {name: 'Belgium', dial: '+32'},
  {name: 'Switzerland', dial: '+41'},
  {name: 'Austria', dial: '+43'},
  {name: 'Denmark', dial: '+45'},
  {name: 'Sweden', dial: '+46'},
  {name: 'Norway', dial: '+47'},
  {name: 'Finland', dial: '+358'},
  {name: 'United States', dial: '+1'},
  {name: 'Canada', dial: '+1'},
  {name: 'Mexico', dial: '+52'},
]

export const DEFAULT_COUNTRY = 'Spain'
export const DEFAULT_DIAL = '+34'
