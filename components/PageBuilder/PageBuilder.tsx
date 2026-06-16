import type {
  PageBuilderBlock,
  HeroCampaignBlock,
  CampaignImageVideoBlock,
  RichTextBlock,
  FeaturedSectionBlock,
  ImageWithProductBlock,
  ProductModuleBlock,
  LookModuleBlock,
  SetModuleBlock,
  TwoColumnBlock,
  DownloadButtonBlock,
} from '@/sanity/types'
import HeroCampaign from './blocks/HeroCampaign/HeroCampaign'
import CampaignImageVideo from './blocks/CampaignImageVideo/CampaignImageVideo'
import RichText from './blocks/RichText/RichText'
import FeaturedSection from './blocks/FeaturedSection/FeaturedSection'
import ImageWithProduct from './blocks/ImageWithProduct/ImageWithProduct'
import ProductModule from './blocks/ProductModule/ProductModule'
import LookModule from './blocks/LookModule/LookModule'
import SetModule from './blocks/SetModule/SetModule'
import TwoColumn from './blocks/TwoColumn/TwoColumn'
import DownloadButton from './blocks/DownloadButton/DownloadButton'
import s from './PageBuilder.module.scss'

interface PageBuilderProps {
  blocks?: PageBuilderBlock[]
  // Aplica separación entre módulos (home y landings). El B2B va sin él (grid apretado).
  spaced?: boolean
}

export default function PageBuilder({blocks, spaced}: PageBuilderProps) {
  if (!blocks?.length) return null

  return (
    <div className={`${s.list} ${spaced ? s.spaced : ''}`.trim()}>
      {blocks.map((block) => {
        switch (block._type) {
          case 'block.heroCampaign':
            return <HeroCampaign key={block._key} block={block as HeroCampaignBlock} />
          case 'block.campaignImageVideo':
            return <CampaignImageVideo key={block._key} block={block as CampaignImageVideoBlock} />
          case 'block.richText':
            return <RichText key={block._key} block={block as RichTextBlock} />
          case 'block.featuredSection':
            return <FeaturedSection key={block._key} block={block as FeaturedSectionBlock} />
          case 'block.imageWithProduct':
            return <ImageWithProduct key={block._key} block={block as ImageWithProductBlock} />
          case 'block.productModule':
            return <ProductModule key={block._key} block={block as ProductModuleBlock} />
          case 'block.lookModule':
            return <LookModule key={block._key} block={block as LookModuleBlock} />
          case 'block.setModule':
            return <SetModule key={block._key} block={block as SetModuleBlock} />
          case 'block.twoColumn':
            return <TwoColumn key={block._key} block={block as TwoColumnBlock} />
          case 'block.downloadButton':
            return <DownloadButton key={block._key} block={block as DownloadButtonBlock} />
          default:
            return null
        }
      })}
    </div>
  )
}
