import type {PortableTextBlock} from 'next-sanity'

export interface B2bAreaGroupData {
  commercialPolicy?: PortableTextBlock[]
  purchaseConditions?: PortableTextBlock[]
  taxInfo?: PortableTextBlock[]
  contactName?: string
  contactEmail?: string
}

export interface B2bAreaData {
  intro?: PortableTextBlock[]
  content?: B2bAreaGroupData
}
