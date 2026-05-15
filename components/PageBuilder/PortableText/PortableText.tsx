import {PortableText as RawPortableText, type PortableTextComponents} from '@portabletext/react'
import type {PortableTextBlock} from '@portabletext/types'
import Link from 'next/link'
import s from './PortableText.module.scss'

interface Props {
  value?: PortableTextBlock[]
  className?: string
}

const components: PortableTextComponents = {
  marks: {
    textBlack: ({children}) => <span className={s.textBlack}>{children}</span>,
    textGray: ({children}) => <span className={s.textGray}>{children}</span>,
    annotationLinkExternal: ({value, children}) => (
      <a
        href={value?.url ?? '#'}
        target={value?.newWindow ? '_blank' : undefined}
        rel={value?.newWindow ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    ),
    annotationLinkEmail: ({value, children}) => (
      <a href={value?.email ? `mailto:${value.email}` : '#'}>{children}</a>
    ),
    annotationProduct: ({value, children}) => {
      const handle = value?.productWithVariant?.product?.store?.slug?.current
      if (!handle) return <>{children}</>
      return <Link href={`/shop/product/${handle}`}>{children}</Link>
    },
  },
}

export default function PortableText({value, className}: Props) {
  if (!value?.length) return null
  return (
    <div className={`${s.root} ${className ?? ''}`.trim()}>
      <RawPortableText value={value} components={components} />
    </div>
  )
}
