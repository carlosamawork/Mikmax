// Inspecciona los facets (productFilters) que el store expone vía Storefront API.
// Uso: node --env-file=.env.local scripts/inspect-shopify-filters.mjs
//
// Sirve para confirmar las keys reales de los atributos de taxonomía (color,
// material/fabric/filling, talla, etc.) antes de cablearlos en el código.

const domain = process.env.SHOPIFY_STORE_DOMAIN
const token = process.env.SHOPIFY_STOREFRONT_ACCESSTOKEN
const apiVersion = process.env.SHOPIFY_API_VERSION || '2025-10'

if (!domain || !token) {
  console.error('Faltan SHOPIFY_STORE_DOMAIN / SHOPIFY_STOREFRONT_ACCESSTOKEN.')
  console.error('Corre con: node --env-file=.env.local scripts/inspect-shopify-filters.mjs')
  process.exit(1)
}

const query = `
  query {
    search(query: "", types: PRODUCT, first: 1) {
      productFilters {
        id
        label
        type
        values { id label count }
      }
    }
  }
`

const res = await fetch(`https://${domain}/api/${apiVersion}/graphql.json`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Shopify-Storefront-Access-Token': token,
  },
  body: JSON.stringify({query}),
})

const json = await res.json()

if (json.errors) {
  console.error('GraphQL errors:', JSON.stringify(json.errors, null, 2))
  process.exit(1)
}

const filters = json?.data?.search?.productFilters ?? []

console.log(`\nFacets expuestos por ${domain} (${apiVersion}):\n`)
for (const f of filters) {
  console.log(`${f.id}   [${f.type}]   "${f.label}"`)
  for (const v of f.values ?? []) {
    console.log(`    - ${v.label}  (count ${v.count})`)
  }
  console.log('')
}

// Pista rápida: resalta los que parezcan de material.
const materialish = filters.filter((f) =>
  /material|fabric|filling|relleno|cubierta/i.test(`${f.id} ${f.label}`),
)
if (materialish.length) {
  console.log('— Posibles facets de MATERIAL detectados —')
  for (const f of materialish) console.log(`  ${f.id}  "${f.label}"`)
} else {
  console.log('(Aún no hay ningún facet de material. Puebla el piloto y vuelve a correr.)')
}
