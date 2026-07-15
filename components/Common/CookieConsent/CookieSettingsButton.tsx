'use client'

type Props = {
  className?: string
  label?: string
}

// Reabre el panel de preferencias de CookieFirst. RGPD exige que retirar o
// modificar el consentimiento sea tan fácil como darlo, por lo que debe estar
// accesible de forma permanente (footer). El data-attribute es el mecanismo
// oficial de CookieFirst; el onClick es fallback por si el binding no aplica.
export default function CookieSettingsButton({className, label = 'Cookie settings'}: Props) {
  return (
    <button
      type="button"
      className={className}
      data-cookiefirst-action="open-preferences"
      onClick={() => window.CookieFirst?.openPanel?.()}
    >
      {label}
    </button>
  )
}
