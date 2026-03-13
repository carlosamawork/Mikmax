import {PortableTextComponents} from '@portabletext/react'

export const portableBlockComponentsTerms: PortableTextComponents = {
  block: {
    normal: ({children}) => <p>{children}</p>,
    h3: ({children}) => <h3>{children}</h3>,
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
  },
  list: {
    bullet: ({children}) => (
      <ul style={{marginLeft: 'calc(var(--margin) / 2)'}}>{children}</ul>
    ),
  },
  listItem: {
    bullet: ({children}) => <li style={{listStyle: 'disc'}}>{children}</li>,
  },
}
