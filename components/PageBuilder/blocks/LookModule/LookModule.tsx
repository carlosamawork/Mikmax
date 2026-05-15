// components/PageBuilder/blocks/LookModule/LookModule.tsx
import SetCard from '../../SetCard/SetCard'
import type {LookModuleBlock} from '@/sanity/types'
import s from './LookModule.module.scss'

interface Props {
  block: LookModuleBlock
}

export default function LookModule({block}: Props) {
  const looks = block.looks ?? []
  if (looks.length === 0) return null

  return (
    <section className={s.section}>
      {block.title && <h2 className={s.title}>{block.title}</h2>}
      <div className={s.list}>
        {looks.map((look) => (
          <SetCard key={look._id} set={look} kind="look" />
        ))}
      </div>
    </section>
  )
}
