// Vuelca el shape crudo de los metafields de material de los productos que los
// tengan, para conocer exactamente la estructura antes de escribir el parsing.
// Uso: node --env-file=.env.local scripts/inspect-product-materials.mjs

const domain = process.env.SHOPIFY_STORE_DOMAIN
const token = process.env.SHOPIFY_STOREFRONT_ACCESSTOKEN
const apiVersion = process.env.SHOPIFY_API_VERSION || '2025-10'

const metafieldBlock = (alias, key) => `
  ${alias}: metafield(namespace: "shopify", key: "${key}") {
    type
    value
    reference {
      ... on Metaobject { id handle type fields { key value } }
    }
    references(first: 25) {
      nodes { ... on Metaobject { id handle type fields { key value } } }
    }
  }
`

const query = `
  query {
    products(first: 50) {
      nodes {
        handle
        title
        ${metafieldBlock('coverMaterial', 'cover-material')}
        ${metafieldBlock('fillerMaterial', 'filler-material')}
        ${metafieldBlock('fabric', 'fabric')}
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

const nodes = json?.data?.products?.nodes ?? []
let found = 0
for (const p of nodes) {
  const mats = ['coverMaterial', 'fillerMaterial', 'fabric'].filter((k) => p[k])
  if (mats.length === 0) continue
  found++
  console.log(`\n=== ${p.title} (${p.handle}) ===`)
  for (const k of mats) {
    console.log(`  [${k}]`, JSON.stringify(p[k], null, 2))
  }
}
if (!found) console.log('Ningún producto de los primeros 50 tiene metafields de material.')
