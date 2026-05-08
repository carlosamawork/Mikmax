// sanity/schemas/objects/blocks/index.ts
import campaignImageVideo from './campaignImageVideo'
import featuredSection from './featuredSection'
import heroCampaign from './heroCampaign'
import imageWithProduct from './imageWithProduct'
import lookModule from './lookModule'
import productModule from './productModule'
import richText from './richText'
import setModule from './setModule'

export const blockSchemas = [
  heroCampaign,
  campaignImageVideo,
  imageWithProduct,
  productModule,
  lookModule,
  setModule,
  featuredSection,
  richText,
]

// Names used in pageBuilder array `of` config
export const blockTypeNames = blockSchemas.map((s) => ({type: s.name}))
