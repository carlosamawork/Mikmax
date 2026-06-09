// sanity/queries/common/newsletterPopup.ts
import type {NewsletterPopup} from '@/sanity/types'
import {getSettings} from './settings'

export async function getNewsletterPopup(): Promise<NewsletterPopup | undefined> {
  const settings = await getSettings()
  return settings.newsletterPopup
}
