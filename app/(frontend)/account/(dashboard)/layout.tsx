import type {ReactNode} from 'react'
import {redirect} from 'next/navigation'
import {getCurrentCustomer} from '@/lib/auth/customer'
import AccountNav from '@/components/Account/AccountNav/AccountNav'
import s from './Account.module.scss'

export default async function AccountLayout({children}: {children: ReactNode}) {
  const session = await getCurrentCustomer()
  if (!session) redirect('/login')

  return (
    <main className={s.account}>
      <AccountNav />
      <div className={s.content}>{children}</div>
    </main>
  )
}
