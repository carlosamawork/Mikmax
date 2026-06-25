import type {Metadata} from 'next'
import {isI18nEnabled} from '@/lib/i18n/config'
import {localizedHref} from '@/lib/i18n/localizedHref'

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
// Imagen OG por defecto, servida desde /public (estable, 1200×900).
export const BASE_IMAGE_URL = buildUrl("/images/mikmax-og.jpg");
export const BASE_IMAGE_WIDTH = 1200;
export const BASE_IMAGE_HEIGHT = 900;

// Único favicon disponible en /public/favicon.png (las variantes light/dark
// /favicon/*.png no existían y devolvían 404).
export const FAVICON_CLEAR = buildUrl("/favicon.png");
export const FAVICON_DARK = buildUrl("/favicon.png");

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

export function buildDefaultMetadata(opts?: {title?: string; description?: string}): Metadata {
	const title = opts?.title || siteTitle;
	const description = opts?.description || siteDescription;
	return {
		title,
		description,
		metadataBase: BASE_URL,
		openGraph: {
			title,
			description,
			url: canonicalHome,
			siteName: title,
			type: 'website',
			images: [{url: BASE_IMAGE_URL, width: BASE_IMAGE_WIDTH, height: BASE_IMAGE_HEIGHT}],
		},
		twitter: {
			card: 'summary_large_image',
			title,
			description,
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

export function localeAlternates(path: string) {
  const canonical = buildUrl(path)
  if (!isI18nEnabled()) return {canonical}
  return {
    canonical,
    languages: {
      en: buildUrl(localizedHref(path, 'en')),
      es: buildUrl(localizedHref(path, 'es')),
    },
  }
}