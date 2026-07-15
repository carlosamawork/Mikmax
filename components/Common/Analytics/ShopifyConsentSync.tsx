'use client'

import {useCallback, useEffect} from 'react'
import Script from 'next/script'

type Props = {
  storefrontAccessToken: string
  checkoutRootDomain: string
  storefrontRootDomain: string
}

type CookieFirstConsent = NonNullable<NonNullable<Window['CookieFirst']>['consent']>

// El consentimiento de CookieFirst vive en www.mikmax.com, pero el checkout
// (y su custom pixel de tracking) corre en shop.mikmax.com. Shopify solo
// dispara los pixels que requieren consentimiento si su cookie
// _tracking_consent lo refleja, así que replicamos cada decisión del banner
// en la Customer Privacy API (escribe la cookie a nivel de dominio raíz
// compartido y el checkout la lee). Mapeo de categorías:
// performance → analytics, advertising → marketing/sale_of_data,
// functional → preferences.
export default function ShopifyConsentSync({
  storefrontAccessToken,
  checkoutRootDomain,
  storefrontRootDomain,
}: Props) {
  const sync = useCallback(
    (detail?: CookieFirstConsent) => {
      const consent = detail ?? window.CookieFirst?.consent
      const privacy = window.Shopify?.customerPrivacy
      if (!consent || !privacy) return
      privacy.setTrackingConsent({
        analytics: !!consent.performance,
        marketing: !!consent.advertising,
        preferences: !!consent.functional,
        sale_of_data: !!consent.advertising,
        headlessStorefront: true,
        checkoutRootDomain,
        storefrontRootDomain,
        storefrontAccessToken,
      })
    },
    [storefrontAccessToken, checkoutRootDomain, storefrontRootDomain],
  )

  // cf_consent trae el consentimiento en detail (respuesta o cambio en el
  // banner); cf_init cubre visitas posteriores con consentimiento ya guardado.
  useEffect(() => {
    const onConsent = (e: Event) => sync((e as CustomEvent<CookieFirstConsent>).detail)
    const onInit = () => sync()
    window.addEventListener('cf_consent', onConsent)
    window.addEventListener('cf_init', onInit)
    return () => {
      window.removeEventListener('cf_consent', onConsent)
      window.removeEventListener('cf_init', onInit)
    }
  }, [sync])

  if (!storefrontAccessToken || !checkoutRootDomain || !storefrontRootDomain) return null

  return (
    <Script
      src="https://cdn.shopify.com/shopifycloud/consent-tracking-api/v0.1/consent-tracking-api.js"
      strategy="afterInteractive"
      onLoad={() => sync()}
    />
  )
}
