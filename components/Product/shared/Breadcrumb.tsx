import Link from 'next/link'
import s from './Breadcrumb.module.scss'

interface Props {
  title: string
}

export default function Breadcrumb({title}: Props) {
  return (
    <nav className={s.breadcrumb} aria-label="Breadcrumb">
      <ol className={s.list}>
        <li><Link href="/">Home</Link></li>
        <li><Link href="/shop">Shop</Link></li>
        <li aria-current="page">{title}</li>
      </ol>
    </nav>
  )
}
