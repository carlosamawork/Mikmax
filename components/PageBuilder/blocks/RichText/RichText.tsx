import PortableText from '../../PortableText/PortableText'
import type {RichTextBlock} from '@/sanity/types'
import s from './RichText.module.scss'

interface Props {
  block: RichTextBlock
}

export default function RichText({block}: Props) {
  if (!block.body?.length) return null
  return (
    <section className={s.section}>
      <PortableText value={block.body} />
    </section>
  )
}
