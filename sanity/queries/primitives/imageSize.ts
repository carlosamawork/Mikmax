export const imageSize = `
    "ref": asset->_id,
    "imageUrl": asset->url,
    "hotspot": hotspot,
    "crop": crop,
    "metadata": asset->metadata{
        dimensions,
    },
    "filename": asset->originalFilename
`
