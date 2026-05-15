// components/PageBuilder/blocks/SetModule/SetModule.tsx
import SetCard from '../../SetCard/SetCard'
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
      <div className={s.list}>
        {sets.map((set) => (
          <SetCard key={set._id} set={set} />
        ))}
      </div>
    </section>
  )
}
