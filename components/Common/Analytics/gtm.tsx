// GTM es el único hub de tags del storefront (los gestiona la agencia).
// Snippet inline renderizado en el HTML del servidor — inmune al ciclo de
// vida de React (con next/script afterInteractive se perdía en cargas
// directas de PDP). Ejecuta después del script síncrono de CookieFirst
// (ver cookieFirst.tsx), que fija los defaults de Consent Mode v2.
export default function GoogleTagManager() {
  const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID
  // Valida el formato antes de interpolarlo en el snippet inline: un valor
  // corrupto en la env var no debe poder inyectar código en el HTML.
  if (!GTM_ID || !/^GTM-[A-Z0-9]+$/.test(GTM_ID)) return null

  const snippet = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`

  return <script id="google-tag-manager" dangerouslySetInnerHTML={{__html: snippet}} />
}
