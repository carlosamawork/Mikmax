'use client'

import Link from 'next/link'
import type {Dictionary} from '@/lib/i18n/getDictionary'
import type {LegalConsentProps} from '@/types/legalConsent'
import s from './LegalConsent.module.scss'

// Copy EN por defecto, igual que el resto de textos fijos de los formularios.
// Las páginas con diccionario cableado pueden pasar dict.legalConsent.
export const DEFAULT_LEGAL_COPY: Dictionary['legalConsent'] = {
  accept: 'I have read and accept the',
  privacyPolicy: 'Privacy Policy',
  controller: 'Data controller: Mikmax.',
  purposeLabel: 'Purpose',
  legitimation: "Legal basis: the data subject's consent.",
  rights:
    'Rights: access, rectification, erasure and other rights, as explained in the Privacy Policy.',
  purposeNewsletter: 'sending you our newsletter with news and offers',
  purposeAccount: 'creating and managing your customer account',
  purposeB2bRegister: 'managing your business account request',
}

// Información de primera capa (RGPD art. 13 / LOPDGDD art. 11): responsable,
// finalidad, legitimación y derechos, más checkbox de aceptación expresa.
export default function LegalConsent({
  id,
  checked,
  onChange,
  purpose,
  copy = DEFAULT_LEGAL_COPY,
  className,
}: LegalConsentProps) {
  return (
    <div className={className ? `${s.legalConsent} ${className}` : s.legalConsent}>
      <label className={s.checkboxWrapper} htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          required
        />
        <span className={`${s.checkboxSquare} ${checked ? s.checked : ''}`} />
        <span className={s.checkboxLabel}>
          {copy.accept}{' '}
          <Link href="/legal/privacy-policy" className={s.link} target="_blank">
            {copy.privacyPolicy}
          </Link>
          {' *'}
        </span>
      </label>

      <p className={s.firstLayer}>
        {copy.controller} {copy.purposeLabel}: {purpose}. {copy.legitimation} {copy.rights}
      </p>
    </div>
  )
}
