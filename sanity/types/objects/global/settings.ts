// sanity/types/objects/global/settings.ts
import type {SEO} from '../seo'
import type {MenuData} from './menu'
import type {FooterColumnData} from './footer'
import type {AnnouncementBanner} from './announcementBanner'

export type SettingsData = {
  menu?: MenuData
  footer?: FooterColumnData
  banner?: AnnouncementBanner
  seo?: SEO
}
