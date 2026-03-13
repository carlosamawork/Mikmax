// fbTypes.d.ts

interface FacebookPixel {
	(command: 'init', pixelId: string, options?: Record<string, unknown>): void;
	(command: 'track', event: string, data?: Record<string, unknown>): void;
	(command: 'trackCustom', event: string, data?: Record<string, unknown>): void;
}

declare global {
	interface Window {
		fbq?: FacebookPixel;
	}
}

export { };