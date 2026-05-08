import type {
  PageBuilderBlock,
  HeroCampaignBlock,
  CampaignImageVideoBlock,
  RichTextBlock,
  FeaturedSectionBlock,
  ImageWithProductBlock,
} from '@/sanity/types'
import HeroCampaign from './blocks/HeroCampaign/HeroCampaign'
import CampaignImageVideo from './blocks/CampaignImageVideo/CampaignImageVideo'
import RichText from './blocks/RichText/RichText'
import FeaturedSection from './blocks/FeaturedSection/FeaturedSection'
import ImageWithProduct from './blocks/ImageWithProduct/ImageWithProduct'
import s from './PageBuilder.module.scss'

interface PageBuilderProps {
  blocks?: PageBuilderBlock[]
}

export default function PageBuilder({blocks}: PageBuilderProps) {
  if (!blocks?.length) return null

  return (
    <div className={s.list}>
      {blocks.map((block) => {
        switch (block._type) {
          case 'block.heroCampaign':
            return <HeroCampaign key={block._key} block={block as HeroCampaignBlock} />
          case 'block.campaignImageVideo':
            return (
              <CampaignImageVideo
                key={block._key}
                block={block as CampaignImageVideoBlock}
              />
            )
          case 'block.richText':
            return <RichText key={block._key} block={block as RichTextBlock} />
          case 'block.featuredSection':
            return (
              <FeaturedSection
                key={block._key}
                block={block as FeaturedSectionBlock}
              />
            )
          case 'block.imageWithProduct':
            return (
              <ImageWithProduct
                key={block._key}
                block={block as ImageWithProductBlock}
              />
            )
          default:
            return null
        }
      })}
    </div>
  )
}
