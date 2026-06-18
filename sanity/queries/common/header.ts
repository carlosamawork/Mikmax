// sanity/queries/common/header.ts
import type {HeaderData} from '@/sanity/types'
import type {Locale} from '@/lib/i18n/config'
import {getSettings} from './settings'

export async function getHeader(lang: Locale = 'en'): Promise<HeaderData> {
  const settings = await getSettings(lang)
  return {menu: settings.menu}
}
