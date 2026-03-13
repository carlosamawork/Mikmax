import {PortableTextComponents} from '@portabletext/react'
import Link from 'next/link'

export const portableBlockComponents = (): PortableTextComponents => {
  return {
    block: {
      normal: ({children}) => <p>{children}</p>,
      h1: ({children}) => <h1>{children}</h1>,
      h2: ({children}) => <h2>{children}</h2>,
      h3: ({children}) => <h3>{children}</h3>,
      h4: ({children}) => <h4>{children}</h4>,
      h5: ({children}) => <h5>{children}</h5>,
      h6: ({children}) => <h6>{children}</h6>,
      blockquote: ({children}) => <blockquote>{children}</blockquote>,
    },
    marks: {
      strong: ({children}) => <strong>{children}</strong>,
      em: ({children}) => <em>{children}</em>,

      annotationLinkExternal: ({value, children}) => (
        <a
          href={value?.url}
          target={value?.newWindow ? '_blank' : '_self'}
          rel="noopener noreferrer"
        >
          {children}
        </a>
      ),

      annotationLinkEmail: ({value, children}) => {
        if (!value?.email) return <>{children}</>
        return <a href={`mailto:${value.email}`}>{children}</a>
      },

      annotationProduct: ({value, children}) => {
        const slug = value?.productWithVariant?.store?.slug?.current
        if (!slug) return <>{children}</>
        return <Link href={`/products/${slug}`}>{children}</Link>
      },
    },
    types: {
      htmlEmbed: ({value}) => {
        if (!value?.html) return null
        return <div dangerouslySetInnerHTML={{__html: value.html}} />
      },
      // TODO: implement when module components are built
      'module.accordion': () => null,
      'module.callout': () => null,
      'module.grid': () => null,
      'module.images': () => null,
      'module.products': () => null,
    },
    list: {
      bullet: ({children}) => (
        <ul style={{marginLeft: 'calc(var(--margin) / 2)'}}>{children}</ul>
      ),
      number: ({children}) => (
        <ol style={{marginLeft: 'calc(var(--margin) / 2)'}}>{children}</ol>
      ),
    },
    listItem: {
      bullet: ({children}) => <li style={{listStyle: 'disc'}}>{children}</li>,
      number: ({children}) => <li style={{listStyle: 'decimal'}}>{children}</li>,
    },
  }
}
