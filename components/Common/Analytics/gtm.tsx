'use client'

import Script from 'next/script'

// GTM es el único hub de tags del storefront (los gestiona la agencia).
// El consentimiento NO se gestiona aquí: CookieFirst (cargado antes, ver
// cookieFirst.tsx) fija Consent Mode v2 y bloquea los tags por categoría.
export default function GoogleTagManager() {
  const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID
  if (!GTM_ID) return null

  return (
    <Script id="google-tag-manager" strategy="afterInteractive">
      {`
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${GTM_ID}');
      `}
    </Script>
  )
}
