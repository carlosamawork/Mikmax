import type {DownloadButtonBlock} from '@/sanity/types'
import s from './DownloadButton.module.scss'

interface Props {
  block: DownloadButtonBlock
}

export default function DownloadButton({block}: Props) {
  if (!block.fileUrl) return null
  return (
    <section className={s.section}>
      {block.description && <p className={s.description}>{block.description}</p>}
      <a className={s.button} href={block.fileUrl} download>
        {block.title}
      </a>
    </section>
  )
}
