// sanity/queries/common/header.ts
import type {HeaderData} from '@/sanity/types'
import {getSettings} from './settings'

export async function getHeader(): Promise<HeaderData> {
  const settings = await getSettings()
  return {menu: settings.menu}
}
