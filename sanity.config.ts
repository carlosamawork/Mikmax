import {defineConfig, isDev} from 'sanity'

import {deskTool} from 'sanity/desk'
import {schemaTypes} from './sanity/schemas'
import {structure} from './sanity/desk'

import {visionTool} from '@sanity/vision'
import {colorInput} from '@sanity/color-input'
import {imageHotspotArrayPlugin} from 'sanity-plugin-hotspot-array'
import {internationalizedArray} from 'sanity-plugin-internationalized-array'
import {media, mediaAssetSource} from 'sanity-plugin-media'
import {dataset, projectId} from './sanity/env'
import {b2bApprove, b2bReject, b2bMoreInfo} from './sanity/actions/b2bActions'

const devOnlyPlugins = [visionTool()]

export default defineConfig({
  name: 'default',
  title: 'Mikmax',
  projectId,
  dataset,
  basePath: "/admin",
  plugins: [
    deskTool({structure}),
    colorInput(),
    imageHotspotArrayPlugin(),
    media(),
    internationalizedArray({
      languages: [
        {id: 'en', title: 'English'},
        {id: 'es', title: 'Español'},
      ],
      defaultLanguages: ['en'],
      fieldTypes: ['string', 'text', 'body'],
    }),
    ...(isDev ? devOnlyPlugins : []),
  ],

  schema: {
    types: schemaTypes,
  },

  document: {
    actions: (prev, ctx) =>
      ctx.schemaType === 'b2bApplication'
        ? [...prev, b2bApprove, b2bReject, b2bMoreInfo]
        : prev,
  },

  form: {
    file: {
      assetSources: (previousAssetSources) => {
        return previousAssetSources.filter((assetSource) => assetSource !== mediaAssetSource)
      },
    },
    image: {
      assetSources: (previousAssetSources) => {
        return previousAssetSources.filter((assetSource) => assetSource === mediaAssetSource)
      },
    },
  },
})
