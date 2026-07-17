// Comprobación read-only de la config B2B en Shopify Admin.
// Uso: node --env-file=.env.local scripts/b2b-check.mjs

const DOMAIN = process.env.SHOPIFY_ADMIN_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-10'
const CLIENT_ID = process.env.SHOPIFY_ADMIN_CLIENT_ID
const CLIENT_SECRET = process.env.SHOPIFY_ADMIN_CLIENT_SECRET

async function getToken() {
  if (process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) return process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
  const res = await fetch(`https://${DOMAIN}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  })
  if (!res.ok) throw new Error(`token ${res.status}: ${await res.text()}`)
  const j = await res.json()
  return j.access_token
}

async function gql(token, query) {
  const res = await fetch(`https://${DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-Shopify-Access-Token': token},
    body: JSON.stringify({query}),
  })
  return res.json()
}

const DEFS_Q = `{
  metafieldDefinitions(first: 50, ownerType: CUSTOMER, namespace: "b2b") {
    edges { node { namespace key name type { name } access { storefront admin } } }
  }
}`

const SCOPES_Q = `{
  currentAppInstallation { accessScopes { handle } }
}`

async function main() {
  console.log(`Tienda: ${DOMAIN} · API ${API_VERSION}`)
  const token = await getToken()
  console.log('✓ Token Admin obtenido\n')

  const scopes = await gql(token, SCOPES_Q)
  const handles = (scopes?.data?.currentAppInstallation?.accessScopes ?? []).map((s) => s.handle)
  console.log('Scopes de la app:')
  for (const need of ['read_customers', 'write_customers']) {
    console.log(`  ${handles.includes(need) ? '✓' : '✗ FALTA'} ${need}`)
  }
  console.log('  (todos:', handles.join(', ') || '—', ')\n')

  const defs = await gql(token, DEFS_Q)
  if (defs.errors) {
    console.log('Error consultando definiciones:', JSON.stringify(defs.errors))
    return
  }
  const nodes = (defs?.data?.metafieldDefinitions?.edges ?? []).map((e) => e.node)
  console.log(`Definiciones de metafield Customer en namespace "b2b": ${nodes.length}`)
  const wanted = ['client_type', 'validated', 'discount_group', 'discount']
  for (const key of wanted) {
    const n = nodes.find((x) => x.key === key)
    if (!n) {
      console.log(`  ✗ FALTA  b2b.${key}`)
      continue
    }
    const sf = n.access?.storefront
    console.log(`  ✓ b2b.${key}  ·  tipo=${n.type?.name}  ·  storefront=${sf}`)
  }
  const extra = nodes.filter((n) => !wanted.includes(n.key))
  if (extra.length) console.log('  (otras:', extra.map((n) => `b2b.${n.key}`).join(', '), ')')
}

main().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})
