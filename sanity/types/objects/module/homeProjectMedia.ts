import { Image } from "../../primitives/image"

export type HomeProjectMediaBase = {
	_key: string
	bleed: 'full' | 'insert'
}

export type HomeProjectImage = HomeProjectMediaBase & {
	type: 'image'
	image: Image
}

export type HomeProjectVideo = HomeProjectMediaBase & {
	type: 'video'
	video: {
		image: Image
		videoUrl: string
	}
}

export type HomeProjectMedia =
	| HomeProjectImage
	| HomeProjectVideo