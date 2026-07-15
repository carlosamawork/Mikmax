import Script from 'next/script'

// CMP (CookieFirst) — gestiona el banner de cookies y Consent Mode v2.
// DEBE cargarse antes que GTM: fija los defaults de consentimiento y los
// updates que los tags del contenedor respetan. beforeInteractive lo coloca
// en el <head> por delante de cualquier otro script.
export default function CookieFirst() {
  const key = process.env.NEXT_PUBLIC_COOKIEFIRST_KEY
  if (!key) return null

  return (
    // App Router sí soporta beforeInteractive en un root layout ((frontend)/layout.tsx
    // renderiza <html>); la regla solo contempla pages/_document.
    // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
    <Script
      src={`https://consent.cookiefirst.com/sites/${key}/consent.js`}
      strategy="beforeInteractive"
    />
  )
}
