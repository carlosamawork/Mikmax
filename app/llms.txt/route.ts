import {buildUrl, siteTitle} from '@/utils/seoHelper'
import {getDictionary} from '@/lib/i18n/getDictionary'
import {B2B_ENABLED} from '@/lib/b2b/flag'

// llms.txt — emerging standard (llmstxt.org) giving AI answer engines a
// concise, curated map of the site. Served at /llms.txt as plain text.
export const dynamic = 'force-static'
export const revalidate = 86400

export function GET() {
  const {meta} = getDictionary('en')

  const lines = [
    `# ${siteTitle}`,
    '',
    `> ${meta.description}`,
    '',
    'Mikmax is a home-textiles ecommerce brand (linen, silk and organic cotton)',
    'based in Barcelona, Spain, serving both retail and professional customers.',
    'The site is available in English and Spanish.',
    '',
    '## Main pages',
    `- [Shop](${buildUrl('/shop')}): Full product catalog, filterable by collection, color, size and material.`,
    `- [Looks](${buildUrl('/looks')}): Styled looks built from Mikmax products.`,
    `- [Sets](${buildUrl('/sets')}): Curated product sets.`,
  ]

  if (B2B_ENABLED) {
    lines.push(
      `- [Mikmax for Business](${buildUrl('/mikmax-for-business')}): B2B program for resellers and interior designers, with professional pricing.`,
    )
  }

  lines.push(
    '',
    '## Notes',
    '- Products, availability and prices are managed in Shopify; product pages are authoritative.',
    `- Full sitemap: ${buildUrl('/sitemap.xml')}`,
    '',
  )

  return new Response(lines.join('\n'), {
    headers: {'Content-Type': 'text/plain; charset=utf-8'},
  })
}
