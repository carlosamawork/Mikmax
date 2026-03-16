import '../globals.css'
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

export async function generateMetadata() {
  return buildDefaultMetadata()
}

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={<div className="loader">Loading...</div>}>
          <ShopProvider>
            {children}
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
