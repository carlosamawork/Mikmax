// types/legalConsent.ts
import type {Dictionary} from '@/lib/i18n/getDictionary'

export interface LegalConsentProps {
  id: string // id único del input (un formulario por página puede repetirse en DOM: footer + popup)
  checked: boolean
  onChange: (checked: boolean) => void
  purpose: string // finalidad concreta del tratamiento en este formulario
  copy?: Dictionary['legalConsent']
  className?: string
}
