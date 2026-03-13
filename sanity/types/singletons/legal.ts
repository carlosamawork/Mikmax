// sanity/types/objects/global/header.ts

import { PortableTextBlock } from "next-sanity";

export type LegalPageData = {
    title: string;
	sections: {
		title: string;
		id: string;
		body: PortableTextBlock[];
	}[];
};
