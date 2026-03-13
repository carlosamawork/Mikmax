export type ExternalLink = {
	_type: 'linkExternal'
	title: string
	url: string
	newWindow?: boolean
}

export type MenuLink = ExternalLink //| InternalLink

// export type ExternalLink = {
// 	_type: 'linkExternal'
// 	title: string
// 	url: string
// 	newWindow?: boolean
//   }
  
//   export type InternalLink = {
// 	_type: 'linkInternal'
// 	title: string
// 	reference: string
// 	slug: string
// 	anchor?: string | null
// 	href: string
//   }
  
//   export type MenuLink = ExternalLink | InternalLink
