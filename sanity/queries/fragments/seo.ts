import { imageData } from "../primitives/imageData";
import { imageSize } from "../primitives/imageSize";

export const seo = `
    title,
    description,
    image{
        ${imageData},
        ${imageSize}
    }
`