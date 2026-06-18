// components/Layout/Header/Header.tsx
import HeaderClient from './HeaderClient'
import {getHeader} from '@/sanity/queries/common/header'
import {getLocale} from '@/lib/i18n/getLocale'
import {getDictionary} from '@/lib/i18n/getDictionary'
import type {HeaderProps} from '@/types/header'

export default async function Header({initialVariant = 'default'}: Omit<HeaderProps, 'menu'>) {
  const locale = await getLocale()
  const data = await getHeader(locale)
  const dict = getDictionary(locale)
  return (
    <HeaderClient
      menu={data?.menu}
      initialVariant={initialVariant}
      copy={dict.header}
      searchCopy={dict.search}
    />
  )
}
