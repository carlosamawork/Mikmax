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

export async function generateMetadata() {
  return buildDefaultMetadata()
}

export const viewport: Viewport = {
  themeColor: 'transparent',
}

export default async function RootLayout({children}: {children: React.ReactNode}) {
  const locale = await getLocale()
  const [footerData, bannerData, newsletterPopupData] = await Promise.all([
    getFooter(),
    getBanner(),
    getNewsletterPopup(),
  ])

  return (
    <html lang={locale}>
      <body>
        <Suspense fallback={<div className="loader">Loading...</div>}>
          <ShopProvider>
            <WishlistProvider>
              <AnnouncementBanner data={bannerData} />
              <Header />
              {children}
              <FooterGate data={footerData?.footer} />
              <CartDrawer />
              <CookieConsent />
              <NewsletterPopup data={newsletterPopupData} />
              <WhatsAppButton />
              {process.env.NODE_ENV === 'production' ? (
                <>
                  <Analytics />
                  <AnalyticsRouteTracker />
                  <ConsentGate category="analytics">
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
