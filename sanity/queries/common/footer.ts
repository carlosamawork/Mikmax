// sanity/queries/common/footer.ts
import type {FooterData} from '@/sanity/types'
import type {Locale} from '@/lib/i18n/config'
import {getSettings} from './settings'

export async function getFooter(lang: Locale = 'en'): Promise<FooterData> {
  const settings = await getSettings(lang)
  return {footer: settings.footer}
}
