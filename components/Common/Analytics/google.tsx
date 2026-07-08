'use client'

import Script from 'next/script'
import {useConsent} from '@/hooks/useConsent'

export default function Analytics() {
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID
  const {consent} = useConsent()

  // RGPD/LSSI: gtag.js no puede cargarse antes de que el usuario resuelva el banner.
  // Este componente se monta dentro de <ConsentGate category="analytics">, así que
  // analytics_storage siempre es granted aquí; ad_storage depende de marketing.
  if (!GA_ID || !consent) return null

  const marketing = consent.marketing ? 'granted' : 'denied'

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />

      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            ad_storage: '${marketing}',
            analytics_storage: 'granted',
            ad_user_data: '${marketing}',
            ad_personalization: '${marketing}'
          });
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            page_title: window.location.pathname,
            page_location: window.location.href
          });
        `}
      </Script>
    </>
  )
}
