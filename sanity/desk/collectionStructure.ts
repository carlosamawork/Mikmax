
import defineStructure from '../utils/defineStructure'

export default defineStructure((S) =>
  S.listItem().title('Collections').schemaType('collection').child(S.documentTypeList('collection'))
)
