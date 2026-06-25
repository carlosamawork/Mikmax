import {localizedField} from '@/lib/i18n/groq'
import {imageData} from '../primitives/imageData'
import {imageSize} from '../primitives/imageSize'

export const seo = `
    ${localizedField('title')},
    ${localizedField('description')},
    image{
        ${imageData},
        ${imageSize},
        "alt": alt
    }
`
