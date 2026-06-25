// Lista las imágenes de contenido (con su alt actual y URL) de los documentos
// editoriales, para revisar/proponer alts.
// Uso: node --env-file=.env.local scripts/inspect-content-images.mjs

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2023-05-17'
const token = process.env.SANITY_WRITE_TOKEN || process.env.NEXT_PUBLIC_SANITY_TOKEN_FORM || ''

const TYPES = ['home', 'page', 'mikmaxForBusiness', 'collection', 'look', 'set']
const query = `*[_type in $types]{_type, title, "slug": coalesce(slug.current, store.slug.current), ...}`

function refToUrl(ref) {
  // image-<id>-<w>x<h>-<ext>
  const m = /^image-([a-f0-9]+)-(\d+x\d+)-(\w+)$/.exec(ref)
  if (!m) return null
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${m[1]}-${m[2]}.${m[3]}`
}

const found = []
function walk(node, doc, path) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, doc, `${path}[${i}]`))
    return
  }
  const ref = node?.asset?._ref
  if (typeof ref === 'string' && ref.startsWith('image-')) {
    found.push({
      doc: `${doc._type}${doc.slug ? `/${doc.slug}` : ''}`,
      title: typeof doc.title === 'string' ? doc.title : Array.isArray(doc.title) ? doc.title.find((t) => t._key === 'en')?.value : '',
      path,
      alt: node.alt ?? node.altText ?? null,
      caption: node.caption ?? null,
      url: refToUrl(ref),
    })
  }
  for (const [k, v] of Object.entries(node)) {
    if (k === 'asset') continue
    walk(v, doc, path ? `${path}.${k}` : k)
  }
}

const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(query)}&$types=${encodeURIComponent(JSON.stringify(TYPES))}`
const res = await fetch(url, token ? {headers: {Authorization: `Bearer ${token}`}} : undefined)
const json = await res.json()
if (json.error) {
  console.error(json.error)
  process.exit(1)
}
for (const doc of json.result ?? []) walk(doc, doc, '')

console.log(`Dataset: ${dataset} — ${found.length} imágenes de contenido\n`)
for (const f of found) {
  console.log(`[${f.doc}] ${f.title || ''}`)
  console.log(`  path:  ${f.path}`)
  console.log(`  alt:   ${f.alt === null ? '∅ (vacío)' : JSON.stringify(f.alt)}`)
  if (f.caption) console.log(`  cap:   ${JSON.stringify(f.caption)}`)
  console.log(`  url:   ${f.url}`)
  console.log('')
}
