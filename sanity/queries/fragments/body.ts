import {imageData} from '../primitives/imageData'
import {imageSize} from '../primitives/imageSize'

const moduleImage = `
  image{
    ${imageData}
    ${imageSize}
  }
`

// Projection for the body portable text array.
// Uses _type conditionals to fetch only the fields each module needs.
export const body = `
  ...,
  _type == 'module.callout' => {
    text,
    links
  },
  _type == 'module.images' => {
    modules[]{
      ${moduleImage}
    },
    fullWidth,
    verticalAlign
  },
  _type == 'module.accordion' => {
    groups[]{
      title,
      body
    }
  },
  _type == 'module.grid' => {
    items[]
  },
  _type == 'module.products' => {
    modules[]{
      _type,
      store{
        title,
        "slug": slug.current,
        "imageUrl": previewImageUrl
      }
    }
  },
  _type == 'htmlEmbed' => {
    html
  }
`
