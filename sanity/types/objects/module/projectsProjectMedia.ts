import { Image } from '../../primitives/image'

export type ProjectMediaBase = {
  _key: string
}

export type ProjectImage = ProjectMediaBase & {
  type: 'image'
  image: Image
}

export type ProjectVideo = ProjectMediaBase & {
  type: 'video'
  video: {
    image: Image
    videoUrl: string
  }
}

export type ProjectMedia = ProjectImage | ProjectVideo
