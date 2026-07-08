// types/footer.ts
import type {FooterColumnData} from '@/sanity/types'
import type {Dictionary} from '@/lib/i18n/getDictionary'
import type {Locale} from '@/lib/i18n/config'

export interface FooterProps {
  data?: FooterColumnData
  footerCopy?: Dictionary['footer']
  newsletterCopy?: Dictionary['newsletter']
  legalCopy?: Dictionary['legalConsent']
  locale?: Locale
  showLanguageSwitcher?: boolean
}

export interface NewsletterFormProps {
  // Visual labels copied from the Figma footer (file u92pryF41Lr42YVpq1Qxsn, frame 11:5580):
  title?: string // "Keep in touch"
  subtitle?: string // "Subscribe to our newsletter to get the latest…"
  placeholder?: string // "Enter your email"
  buttonLabel?: string // "Subscribe"
}
