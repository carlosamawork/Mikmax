import {getSetArchiveItems} from '@/lib/set/buildSetsArchive'
import SetList from '@/components/Sets/SetList/SetList'

export default async function SetsArchive() {
  const items = await getSetArchiveItems()
  return <SetList items={items} />
}
