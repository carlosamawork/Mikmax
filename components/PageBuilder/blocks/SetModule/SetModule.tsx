// components/PageBuilder/blocks/SetModule/SetModule.tsx
import BundleCard from '../../BundleCard/BundleCard'
import type {SetModuleBlock} from '@/sanity/types'
import s from './SetModule.module.scss'

interface Props {
  block: SetModuleBlock
}

export default function SetModule({block}: Props) {
  const sets = block.sets ?? []
  if (sets.length === 0) return null

  return (
    <section className={s.section}>
      {block.title && <h2 className={s.title}>{block.title}</h2>}
      <div className={s.row}>
        {sets.map((set) => (
          <BundleCard key={set._id} bundle={set} kind="set" />
        ))}
      </div>
    </section>
  )
}
