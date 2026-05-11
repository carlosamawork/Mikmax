// types/header.ts
import type {MenuData} from './menu'

export type HeaderVariant = 'default' | 'variant2' | 'variant3' | 'z'

export interface HeaderProps {
  menu?: MenuData
  initialVariant?: HeaderVariant
}
