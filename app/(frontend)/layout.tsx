import '../globals.css'
import type {Viewport} from 'next'
import {buildDefaultMetadata} from '@/utils/seoHelper'
import '../../styles/main.scss'
import React, {Suspense} from 'react'
import ShopProvider from '../../context/shopContext'
import WishlistProvider from '../../context/wishlistContext'
import CookieFirst from '@/components/Common/Analytics/cookieFirst'
import GoogleTagManager from '@/components/Common/Analytics/gtm'
import ShopifyConsentSync from '@/components/Common/Analytics/ShopifyConsentSync'
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
              <NewsletterPopup data={newsletterPopupData} legalCopy={dict.legalConsent} />
              <WhatsAppButton />
              {process.env.NODE_ENV === 'production' ? (
                <>
                  {/* RGPD: CookieFirst (CMP) gestiona banner y Consent Mode v2, y debe
                      cargar antes que GTM. GTM es el único hub de tags: los pixels
                      (GA4, Meta, etc.) los configura la agencia en el contenedor. */}
                  <CookieFirst />
                  <GoogleTagManager />
                  {/* Replica el consentimiento en la cookie de Shopify para que el
                      custom pixel del checkout (shop.mikmax.com) pueda dispararse.
                      El token Storefront es público por diseño (API de navegador). */}
                  <ShopifyConsentSync
                    storefrontAccessToken={process.env.SHOPIFY_STOREFRONT_ACCESSTOKEN ?? ''}
                    checkoutRootDomain={process.env.SHOPIFY_STORE_DOMAIN ?? ''}
                    storefrontRootDomain={new URL(
                      process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.mikmax.com',
                    ).hostname
                      .split('.')
                      .slice(-2)
                      .join('.')}
                  />
                </>
              ) : null}
            </WishlistProvider>
          </ShopProvider>
        </Suspense>
      </body>
    </html>
  )
}
