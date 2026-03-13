import {defineConfig, isDev} from 'sanity'

import {deskTool} from 'sanity/desk'
import {schemaTypes} from './sanity/schemas'
import {structure} from './sanity/desk'

import {visionTool} from '@sanity/vision'
import {colorInput} from '@sanity/color-input'
import {imageHotspotArrayPlugin} from 'sanity-plugin-hotspot-array'
import {media, mediaAssetSource} from 'sanity-plugin-media'
import {dataset, projectId} from './sanity/env'

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
    ...(isDev ? devOnlyPlugins : []),
  ],

  schema: {
    types: schemaTypes,
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
