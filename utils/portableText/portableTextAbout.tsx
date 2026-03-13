import {PortableTextComponents} from '@portabletext/react'

export const portableBlockComponentsAbout: PortableTextComponents = {
  block: {
    normal: ({children}) => <p className="font-about">{children}</p>,
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
  list: {},
  listItem: {},
}
