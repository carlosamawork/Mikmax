// CMP (CookieFirst) — gestiona el banner de cookies y Consent Mode v2.
// Script SÍNCRONO a propósito (es el embed oficial de CookieFirst): se
// renderiza en el HTML del servidor y bloquea el parseo lo justo para que
// los defaults de Consent Mode existan SIEMPRE antes de que GTM arranque.
// No usar next/script aquí: la inyección vía ciclo de vida de React se pierde
// en cargas directas de PDP (el router.replace del primer efecto la cancela).
export default function CookieFirst() {
  const key = process.env.NEXT_PUBLIC_COOKIEFIRST_KEY
  if (!key) return null

  return (
    // eslint-disable-next-line @next/next/no-sync-scripts
    <script src={`https://consent.cookiefirst.com/sites/${key}/consent.js`} />
  )
}
