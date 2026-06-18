// sanity/queries/common/banner.ts
import type {AnnouncementBanner} from '@/sanity/types'
import type {Locale} from '@/lib/i18n/config'
import {getSettings} from './settings'

export async function getBanner(lang: Locale = 'en'): Promise<AnnouncementBanner | undefined> {
  const settings = await getSettings(lang)
  return settings.banner
}
