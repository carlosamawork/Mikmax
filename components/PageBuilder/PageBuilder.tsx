import type {PageBuilderBlock, HeroCampaignBlock} from '@/sanity/types'
import HeroCampaign from './blocks/HeroCampaign/HeroCampaign'

interface PageBuilderProps {
  blocks?: PageBuilderBlock[]
}

export default function PageBuilder({blocks}: PageBuilderProps) {
  if (!blocks?.length) return null

  return (
    <>
      {blocks.map((block) => {
        switch (block._type) {
          case 'block.heroCampaign':
            return <HeroCampaign key={block._key} block={block as HeroCampaignBlock} />
          case 'block.campaignImageVideo':
          case 'block.featuredSection':
          case 'block.richText':
          default:
            return null
        }
      })}
    </>
  )
}
