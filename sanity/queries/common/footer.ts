// sanity/queries/common/footer.ts
import type {FooterData} from '@/sanity/types'
import {getSettings} from './settings'

export async function getFooter(): Promise<FooterData> {
  const settings = await getSettings()
  return {footer: settings.footer}
}
