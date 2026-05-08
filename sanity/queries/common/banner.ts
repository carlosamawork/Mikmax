// sanity/queries/common/banner.ts
import type {AnnouncementBanner} from '@/sanity/types'
import {getSettings} from './settings'

export async function getBanner(): Promise<AnnouncementBanner | undefined> {
  const settings = await getSettings()
  return settings.banner
}
