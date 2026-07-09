'use client'

import {OPEN_COOKIE_SETTINGS_EVENT} from './CookieConsent'

type Props = {
  className?: string
  label?: string
}

// Botón que reabre el banner de cookies en modo preferencias. RGPD exige que
// retirar o modificar el consentimiento sea tan fácil como darlo, por lo que
// debe estar accesible de forma permanente (footer).
export default function CookieSettingsButton({className, label = 'Cookie settings'}: Props) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))}
    >
      {label}
    </button>
  )
}
