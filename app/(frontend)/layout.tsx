import '../globals.css'
import type {Viewport} from 'next'
import {buildDefaultMetadata} from '@/utils/seoHelper'
import '../../styles/main.scss'
import React, {Suspense} from 'react'
import ShopProvider from '../../context/shopContext'
import WishlistProvider from '../../context/wishlistContext'
import Analytics from '@/components/Common/Analytics/google'
import ConsentGate from '@/components/Common/Analytics/consentGate'
import FacebookPixel from '@/components/Common/Analytics/facebook'
import Hotjar from '@/components/Common/Analytics/hotjar'
import PinterestTag from '@/components/Common/Analytics/pinterest'
import AnalyticsRouteTracker from '@/components/Common/Analytics/AnalyticsRouteTracker'
import GoogleTagManager from '@/components/Common/Analytics/gtm'
import CookieConsent from '@/components/Common/CookieConsent/CookieConsent'
import {Header, AnnouncementBanner} from '@/components/Layout'
import FooterGate from '@/components/Layout/Footer/FooterGate'
import CartDrawer from '@/components/Layout/CartDrawer/CartDrawer'
import NewsletterPopup from '@/components/Layout/NewsletterPopup/NewsletterPopup'
import WhatsAppButton from '@/components/Common/WhatsAppButton/WhatsAppButton'
import {getFooter} from '@/sanity/queries/common/footer'
import {getBanner} from '@/sanity/queries/common/banner'
import {getNewsletterPopup} from '@/sanity/queries/common/newsletterPopup'
import {getLocale} from '@/lib/i18n/getLocale'
import {getDictionary} from '@/lib/i18n/getDictionary'
import {isI18nEnabled} from '@/lib/i18n/config'

export async function generateMetadata() {
  const locale = await getLocale()
  const dict = getDictionary(locale)
  return buildDefaultMetadata({title: dict.meta.title, description: dict.meta.description})
}

export const viewport: Viewport = {
  themeColor: 'transparent',
}

export default async function RootLayout({children}: {children: React.ReactNode}) {
  const locale = await getLocale()
  const dict = getDictionary(locale)
  const [footerData, bannerData, newsletterPopupData] = await Promise.all([
    getFooter(locale),
    getBanner(locale),
    getNewsletterPopup(locale),
  ])

  return (
    <html lang={locale}>
      <body>
        <Suspense fallback={<div className="loader">Loading...</div>}>
          <ShopProvider>
            <WishlistProvider>
              <AnnouncementBanner data={bannerData} copy={dict.banner} />
              <Header />
              <main>{children}</main>
              <FooterGate
                data={footerData?.footer}
                footerCopy={dict.footer}
                newsletterCopy={dict.newsletter}
                legalCopy={dict.legalConsent}
                locale={locale}
                showLanguageSwitcher={isI18nEnabled()}
              />
              <CartDrawer copy={dict.cart} />
              <CookieConsent />
              <NewsletterPopup data={newsletterPopupData} legalCopy={dict.legalConsent} />
              <WhatsAppButton />
              {process.env.NODE_ENV === 'production' ? (
                <>
                  <AnalyticsRouteTracker />
                  {/* RGPD/LSSI: ningún script de terceros (tampoco gtag.js) se carga
                      antes de que el usuario acepte o rechace en el banner. */}
                  {/* GTM se auto-gatea con useConsent (analytics O marketing) porque
                      el contenedor puede alojar tags de ambas categorías. */}
                  <GoogleTagManager />
                  <ConsentGate category="analytics">
                    <Analytics />
                    <Hotjar />
                  </ConsentGate>
                  <ConsentGate category="marketing">
                    <FacebookPixel />
                    <PinterestTag />
                  </ConsentGate>
                </>
              ) : null}
            </WishlistProvider>
          </ShopProvider>
        </Suspense>
      </body>
    </html>
  )
}
