import {PortableTextComponents} from '@portabletext/react'

type CreditsComponentsOptions = {
  paragraphClassName?: string
}

export const portableBlockComponentsCredits = (
  options: CreditsComponentsOptions = {}
): PortableTextComponents => {
  const {paragraphClassName = 'font-xs'} = options

  return {
    block: {
      normal: ({children}) => <p className={paragraphClassName}>{children}</p>,
    },
    marks: {
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
}
