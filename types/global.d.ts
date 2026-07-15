export {}

// Declaración única de los globals de window que usa la capa de tracking.
// No declarar Window en otros archivos: TypeScript exige que las propiedades
// duplicadas tengan tipos idénticos y acaba en conflictos.
declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[]
    CookieFirst?: {
      openPanel?: () => void
      consent?: {
        necessary?: boolean
        performance?: boolean
        functional?: boolean
        advertising?: boolean
      } | null
    }
    Shopify?: {
      customerPrivacy?: {
        setTrackingConsent: (consent: Record<string, unknown>, callback?: () => void) => void
      }
    }
  }
}
