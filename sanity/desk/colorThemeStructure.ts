
import defineStructure from '../utils/defineStructure'

export default defineStructure((S) =>
  S.listItem()
    .title('Color themes')
    .schemaType('colorTheme')
    .child(S.documentTypeList('colorTheme'))
)
