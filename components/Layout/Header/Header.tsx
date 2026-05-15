// components/Layout/Header/Header.tsx
import HeaderClient from './HeaderClient'
import {getHeader} from '@/sanity/queries/common/header'
import type {HeaderProps} from '@/types/header'

export default async function Header({initialVariant = 'default'}: Omit<HeaderProps, 'menu'>) {
  const data = await getHeader()
  return <HeaderClient menu={data?.menu} initialVariant={initialVariant} />
}
