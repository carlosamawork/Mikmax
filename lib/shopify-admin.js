// Admin API de Shopify — SOLO para escribir el metafield de cliente (fecha de nacimiento),
// porque la Storefront API no permite escribir metafields de cliente.
//
// Autenticación (dos modos soportados):
//   A) client_credentials (recomendado, lo que da tu app):
//        SHOPIFY_ADMIN_CLIENT_ID, SHOPIFY_ADMIN_CLIENT_SECRET  → token de 24h, renovado solo.
//   B) token estático (si algún día tienes un shpat_ permanente):
//        SHOPIFY_ADMIN_ACCESS_TOKEN
//   Más: SHOPIFY_ADMIN_DOMAIN (dominio *.myshopify.com; si no, usa SHOPIFY_STORE_DOMAIN)

const STATIC_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
const CLIENT_ID = process.env.SHOPIFY_ADMIN_CLIENT_ID
const CLIENT_SECRET = process.env.SHOPIFY_ADMIN_CLIENT_SECRET
const ADMIN_DOMAIN = process.env.SHOPIFY_ADMIN_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-10'

// Cache en memoria del token de 24h (client_credentials).
let cachedToken = null
let cachedExpiry = 0

async function getAdminToken() {
  // Modo B: token estático permanente.
  if (STATIC_TOKEN) return STATIC_TOKEN

  // Modo A: client_credentials → token de 24h, cacheado.
  if (!CLIENT_ID || !CLIENT_SECRET) return null
  const now = Date.now()
  if (cachedToken && now < cachedExpiry - 60_000) return cachedToken

  const res = await fetch(`https://${ADMIN_DOMAIN}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json = await res.json()
  if (!json?.access_token) return null
  cachedToken = json.access_token
  cachedExpiry = now + (json.expires_in ?? 86399) * 1000
  return cachedToken
}

async function adminData(query, variables) {
  const token = await getAdminToken()
  if (!token) throw new Error('Admin API not configured (missing credentials/token).')
  const res = await fetch(`https://${ADMIN_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-Shopify-Access-Token': token},
    body: JSON.stringify({query, variables}),
    cache: 'no-store',
  })
  return res.json()
}

// birthday en formato ISO 'YYYY-MM-DD'. customerId = gid://shopify/Customer/123
export async function setCustomerBirthday(customerId, birthday) {
  if (!STATIC_TOKEN && (!CLIENT_ID || !CLIENT_SECRET)) {
    return {error: 'Admin API not configured — date of birth not saved.'}
  }
  const query = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message }
      }
    }
  `
  const variables = {
    metafields: [
      {
        ownerId: customerId,
        namespace: 'custom',
        key: 'birthday',
        type: 'date',
        value: birthday,
      },
    ],
  }
  try {
    const json = await adminData(query, variables)
    const errors = json?.data?.metafieldsSet?.userErrors ?? []
    if (errors.length) return {error: errors[0].message}
    return {ok: true}
  } catch (err) {
    return {error: String(err)}
  }
}

// Wishlist como metafield JSON (array de handles de producto). customerId = gid://shopify/Customer/123
export async function setCustomerWishlist(customerId, handles) {
  if (!STATIC_TOKEN && (!CLIENT_ID || !CLIENT_SECRET)) {
    return {error: 'Admin API not configured — wishlist not saved.'}
  }
  const query = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message }
      }
    }
  `
  const variables = {
    metafields: [
      {
        ownerId: customerId,
        namespace: 'custom',
        key: 'wishlist',
        type: 'json',
        value: JSON.stringify(handles),
      },
    ],
  }
  try {
    const json = await adminData(query, variables)
    const errors = json?.data?.metafieldsSet?.userErrors ?? []
    if (errors.length) return {error: errors[0].message}
    return {ok: true}
  } catch (err) {
    return {error: String(err)}
  }
}
