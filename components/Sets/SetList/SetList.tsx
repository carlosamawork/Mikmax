import type {SetArchiveItem} from '@/types/set'
import SetRow from '@/components/Sets/SetRow/SetRow'
import s from './SetList.module.scss'

export default function SetList({items}: {items: SetArchiveItem[]}) {
  if (items.length === 0) {
    return (
      <div className={s.empty}>
        <p>No sets yet.</p>
      </div>
    )
  }
  return (
    <div className={s.list}>
      {items.map((item) => (
        <SetRow key={item.id} item={item} />
      ))}
    </div>
  )
}
