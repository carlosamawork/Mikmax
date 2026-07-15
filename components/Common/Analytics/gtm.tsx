'use client'

import Script from 'next/script'
import {useConsent} from '@/hooks/useConsent'

export default function GoogleTagManager() {
  const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID
  const {consent} = useConsent()

  // RGPD/LSSI: gtm.js no se carga hasta que el usuario resuelve el banner.
  // GTM es un contenedor que puede alojar tags de analytics Y de marketing,
  // así que se carga si hay al menos una categoría aceptada — con Consent Mode
  // fijado por categoría ANTES del snippet, para que cada tag del contenedor
  // respete lo que el usuario ha concedido. Las revocaciones posteriores llegan
  // vía applyConsentToGtag (gtag('consent','update') sobre el mismo dataLayer).
  if (!GTM_ID || !consent) return null
  if (!consent.analytics && !consent.marketing) return null

  const analytics = consent.analytics ? 'granted' : 'denied'
  const marketing = consent.marketing ? 'granted' : 'denied'

  return (
    <Script id="google-tag-manager" strategy="afterInteractive">
      {`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('consent', 'default', {
          analytics_storage: '${analytics}',
          ad_storage: '${marketing}',
          ad_user_data: '${marketing}',
          ad_personalization: '${marketing}'
        });
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${GTM_ID}');
      `}
    </Script>
  )
}
