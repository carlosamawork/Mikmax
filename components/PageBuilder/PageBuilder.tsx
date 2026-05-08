import type {PageBuilderBlock} from '@/sanity/types'

interface PageBuilderProps {
  blocks?: PageBuilderBlock[]
}

export default function PageBuilder({blocks}: PageBuilderProps) {
  if (!blocks?.length) return null

  return (
    <>
      {blocks.map((block) => {
        switch (block._type) {
          // Block components are wired in Tasks 3.6–3.9.
          // Until then every case returns null so the home renders empty
          // but does not crash with populated data.
          case 'block.heroCampaign':
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
