// components/PageBuilder/blocks/LookModule/LookModule.tsx
import BundleCard from '../../BundleCard/BundleCard'
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
      <div className={s.row}>
        {looks.map((look) => (
          <BundleCard key={look._id} bundle={look} kind="look" />
        ))}
      </div>
    </section>
  )
}
