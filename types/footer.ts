// types/footer.ts
import type {FooterColumnData} from '@/sanity/types'

export interface FooterProps {
  data?: FooterColumnData
}

export interface NewsletterFormProps {
  // Visual labels copied from the Figma footer (file u92pryF41Lr42YVpq1Qxsn, frame 11:5580):
  title?: string // "Keep in touch"
  subtitle?: string // "Subscribe to our newsletter to get the latest…"
  placeholder?: string // "Enter your email"
  buttonLabel?: string // "Subscribe"
}
