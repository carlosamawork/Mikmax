import type {ReactNode} from 'react'
import s from './AuthLayout.module.scss'

// Layout compartido de las pantallas de auth (register, login, forgot, reset):
// desktop 2 columnas (form + imagen a sangre), mobile 1 columna sin imagen.
export default function AuthLayout({children}: {children: ReactNode}) {
  return (
    <div className={s.page}>
      <section className={s.formCol}>{children}</section>
      <aside className={s.imageCol} aria-hidden="true" />
    </div>
  )
}
