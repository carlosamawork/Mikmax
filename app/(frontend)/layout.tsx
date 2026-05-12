import '../globals.css'
import type {Viewport} from 'next'
import {buildDefaultMetadata} from '@/utils/seoHelper'
import '../../styles/main.scss'
import React, {Suspense} from 'react'
import ShopProvider from '../../context/shopContext'
import Analytics from '@/components/Common/Analytics/google'
import ConsentGate from '@/components/Common/Analytics/consentGate'
import FacebookPixel from '@/components/Common/Analytics/facebook'
import Hotjar from '@/components/Common/Analytics/hotjar'
import PinterestTag from '@/components/Common/Analytics/pinterest'
import CookieConsent from '@/components/Common/CookieConsent/CookieConsent'
import {Header, AnnouncementBanner} from '@/components/Layout'
import FooterGate from '@/components/Layout/Footer/FooterGate'
import CartDrawer from '@/components/Layout/CartDrawer/CartDrawer'
import {getFooter} from '@/sanity/queries/common/footer'
import {getBanner} from '@/sanity/queries/common/banner'

export async function generateMetadata() {
  return buildDefaultMetadata()
}

export const viewport: Viewport = {
  themeColor: 'transparent',
}

export default async function RootLayout({children}: {children: React.ReactNode}) {
  const [footerData, bannerData] = await Promise.all([getFooter(), getBanner()])

  return (
    <html lang="es">
      <body>
        <Suspense fallback={<div className="loader">Loading...</div>}>
          <ShopProvider>
            <AnnouncementBanner data={bannerData} />
            <Header />
            {children}
            <FooterGate data={footerData?.footer} />
            <CartDrawer />
            {/* <CookieConsent />
            {process.env.NODE_ENV === 'production' ? (
              <>
                <ConsentGate category="analytics">
                  <Analytics />
                  <Hotjar />
                </ConsentGate>

                <ConsentGate category="marketing">
                  <FacebookPixel />
                  <PinterestTag />
                </ConsentGate>
              </>
            ) : null} */}
          </ShopProvider>
        </Suspense>
      </body>
    </html>
  )
}
