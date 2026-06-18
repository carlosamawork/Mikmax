// sanity/queries/common/newsletterPopup.ts
import type {NewsletterPopup} from '@/sanity/types'
import type {Locale} from '@/lib/i18n/config'
import {getSettings} from './settings'

export async function getNewsletterPopup(lang: Locale = 'en'): Promise<NewsletterPopup | undefined> {
  const settings = await getSettings(lang)
  return settings.newsletterPopup
}
