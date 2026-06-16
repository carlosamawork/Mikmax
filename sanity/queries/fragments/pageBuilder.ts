import {image} from './image'
import {productCardProjection, setCardProjection} from './cards'

// Proyección de un slot imagen/vídeo (heroCampaign, campaignImageVideo, twoColumnCell)
export const mediaProjection = `
  mediaType,
  image{
    ${image},
    "alt": alt
  },
  video{
    src,
    posterAlt,
    poster{
      ${image}
    }
  }
`

// Proyección completa de los bloques del pageBuilder. El caller ya seleccionó
// _key y _type en el item; este fragmento aporta los campos por tipo.
export const pageBuilderProjection = `
  _type == "block.heroCampaign" => {
    slides[]{
      _key,
      ${mediaProjection},
      title,
      url
    }
  },
  _type == "block.campaignImageVideo" => {
    ${mediaProjection},
    headline,
    url,
    aspectRatio,
    fullBleed,
    narrow
  },
  _type == "block.featuredSection" => {
    slides[]{
      _key,
      image{
        ${image},
        "alt": alt
      },
      title,
      url
    }
  },
  _type == "block.imageWithProduct" => {
    feature{
      image{
        ${image},
        "alt": alt
      },
      title,
      url
    },
    "product": product->{ ${productCardProjection} },
    imagePosition
  },
  _type == "block.productModule" => {
    title,
    layout,
    source,
    "products": select(
      source == "manual" => manualProducts[]->{ ${productCardProjection} },
      // Collection mode requires a product↔collection link not yet present
      // in the schema. Returns empty until Shopify Storefront-driven
      // resolution lands in a later phase.
      []
    )
  },
  _type == "block.lookModule" => {
    title,
    layout,
    "looks": looks[]->{ ${setCardProjection} }
  },
  _type == "block.setModule" => {
    title,
    subtitle,
    "product": product->{ ${productCardProjection} },
    images[]{
      ${image},
      "alt": alt
    }
  },
  _type == "block.richText" => {
    body
  },
  _type == "block.twoColumn" => {
    left{ kind, body, ${mediaProjection}, caption, captionTheme, url },
    right{ kind, body, ${mediaProjection}, caption, captionTheme, url }
  },
  _type == "block.downloadButton" => {
    title,
    description,
    "fileUrl": file.asset->url,
    "fileName": file.asset->originalFilename
  }
`
