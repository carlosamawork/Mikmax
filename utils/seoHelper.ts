import type {Metadata} from 'next'

// lib/seoHelper.js

// 🧭 Determine the base URL depending on the environment
export const BASE_URL = new URL(
	process.env.NODE_ENV === "production"
		? "https://www.mikmax.com"
		: "https://www.mikmax.com"
);

// 🧱 Helper function for consistent URL creation
export const buildUrl = (path = "/") => new URL(path, BASE_URL).toString();

// 🌍 Global site metadata
export const siteTitle = "Mikmax";
export const siteDescription =
	"Textiles del hogar de alta calidad en lino, seda y algodón orgánico. Descubre Mikmax, diseño y confort para tu hogar o hotel.";

// ⚠️ Warn developer if BASE_URL still points to the template domain
if (process.env.NODE_ENV === "development") {
	if (BASE_URL.href.includes("ama")) {
		console.warn(
			"%c⚠️ You should update BASE_URL in lib/seoHelper.js with your project URL!",
			"color: orange; font-weight: bold;"
		);
	}
}

// 🔗 Social & canonical links
export const linkInstagram = "";
export const canonicalStudio = buildUrl("/studio");
export const canonicalHome = buildUrl("/");
export const canonicalAbout = buildUrl("/about"); // example if needed

// 🖼️ Images & favicons
export const BASE_IMAGE_URL = buildUrl("/images/mikmax_fbshare_1200x800.jpg"); // TODO: reemplazar con la imagen OG real de Mikmax
export const BASE_IMAGE_WIDTH = 1200;
export const BASE_IMAGE_HEIGHT = 800;

export const FAVICON_CLEAR = buildUrl("/favicon/favicon_clear.png");
export const FAVICON_DARK = buildUrl("/favicon/favicon_dark.png");

export function getFavicons() {
	return {
		icon: [
			{ media: '(prefers-color-scheme: light)', url: FAVICON_CLEAR, href: FAVICON_CLEAR },
			{ media: '(prefers-color-scheme: dark)', url: FAVICON_DARK, href: FAVICON_DARK },
		],
		shortcut: FAVICON_CLEAR,
		apple: FAVICON_CLEAR,
		other: { rel: 'apple-touch-icon-precomposed', url: FAVICON_CLEAR },
	};
}

export function buildDefaultMetadata(): Metadata {
	return {
		title: siteTitle,
		description: siteDescription,
		metadataBase: BASE_URL,
		openGraph: {
			title: siteTitle,
			description: siteDescription,
			url: canonicalHome,
			siteName: siteTitle,
			type: 'website',
			images: [{url: BASE_IMAGE_URL, width: BASE_IMAGE_WIDTH, height: BASE_IMAGE_HEIGHT}],
		},
		twitter: {
			card: 'summary_large_image',
			title: siteTitle,
			description: siteDescription,
			images: [BASE_IMAGE_URL],
		},
		robots: {
			index: true,
			follow: true,
			googleBot: {index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1},
		},
		alternates: {
			canonical: canonicalHome,
		},
		icons: getFavicons(),
	}
}

export function formatSlug(slug: string) {
	if (!slug) return '';
	// Replace dashes/underscores with spaces and capitalize first letter of each word
	return slug
		.replace(/[-_]/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase());
}