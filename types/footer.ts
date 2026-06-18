// types/footer.ts
import type {FooterColumnData} from '@/sanity/types'
import type {Dictionary} from '@/lib/i18n/getDictionary'

export interface FooterProps {
  data?: FooterColumnData
  footerCopy?: Dictionary['footer']
  newsletterCopy?: Dictionary['newsletter']
}

export interface NewsletterFormProps {
  // Visual labels copied from the Figma footer (file u92pryF41Lr42YVpq1Qxsn, frame 11:5580):
  title?: string // "Keep in touch"
  subtitle?: string // "Subscribe to our newsletter to get the latest…"
  placeholder?: string // "Enter your email"
  buttonLabel?: string // "Subscribe"
}
