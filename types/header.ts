// types/header.ts
import type {MenuData} from './menu'
import type {Dictionary} from '@/lib/i18n/getDictionary'
import type {Locale} from '@/lib/i18n/config'

export type HeaderVariant = 'default' | 'variant2' | 'variant3' | 'z'

export interface HeaderProps {
  menu?: MenuData
  initialVariant?: HeaderVariant
  copy?: Dictionary['header']
  searchCopy?: Dictionary['search']
  locale?: Locale
  showLanguageSwitcher?: boolean
}
