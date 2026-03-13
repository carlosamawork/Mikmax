export type ImageMetadata = {
	dimensions: {
		width: number;
		height: number;
	};
};

export type Image = {
	imageUrl: string;
	metadata: ImageMetadata;
	filename?: string;
};
