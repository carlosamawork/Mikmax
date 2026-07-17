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

// Añade tags a un customer. customerId = gid://shopify/Customer/123
export async function customerTagsAdd(customerId, tags) {
  if (!STATIC_TOKEN && (!CLIENT_ID || !CLIENT_SECRET)) {
    return {error: 'Admin API not configured — tags not added.'}
  }
  const query = `
    mutation tagsAdd($id: ID!, $tags: [String!]!) {
      tagsAdd(id: $id, tags: $tags) {
        node { id }
        userErrors { field message }
      }
    }
  `
  try {
    const json = await adminData(query, {id: customerId, tags})
    const errors = json?.data?.tagsAdd?.userErrors ?? []
    if (errors.length) return {error: errors[0].message}
    return {ok: true}
  } catch (err) {
    return {error: String(err)}
  }
}

// Escribe los metafields B2B (namespace "b2b"). customerId = gid://shopify/Customer/123
export async function setCustomerB2bData(customerId) {
  if (!STATIC_TOKEN && (!CLIENT_ID || !CLIENT_SECRET)) {
    return {error: 'Admin API not configured — b2b metafields not saved.'}
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
        namespace: 'b2b',
        key: 'validated',
        type: 'single_line_text_field',
        value: 'true',
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

// Crea un customer desde Admin SIN contraseña y le envía invitación de activación.
// Para el flujo REVIEW (aprobación manual posterior). Devuelve {id} o {error}.
export async function adminCustomerCreate({email, firstName}) {
  if (!STATIC_TOKEN && (!CLIENT_ID || !CLIENT_SECRET)) {
    return {error: 'Admin API not configured — customer not created.'}
  }
  const query = `
    mutation customerCreate($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer { id }
        userErrors { field message }
      }
    }
  `
  try {
    const json = await adminData(query, {input: {email, firstName}})
    const errors = json?.data?.customerCreate?.userErrors ?? []
    if (errors.length) return {error: errors[0].message}
    return {id: json?.data?.customerCreate?.customer?.id}
  } catch (err) {
    return {error: String(err)}
  }
}

// Busca un customer por email exacto (customerByIdentifier → sin lag del índice de búsqueda).
// Devuelve {id} (gid, o null si no existe) o {error}.
export async function findCustomerIdByEmail(email) {
  if (!STATIC_TOKEN && (!CLIENT_ID || !CLIENT_SECRET)) {
    return {error: 'Admin API not configured.'}
  }
  const query = `
    query customerByIdentifier($id: CustomerIdentifierInput!) {
      customerByIdentifier(identifier: $id) { id }
    }
  `
  try {
    const json = await adminData(query, {id: {emailAddress: email}})
    if (json?.errors?.length) return {error: JSON.stringify(json.errors.map((e) => e.message))}
    return {id: json?.data?.customerByIdentifier?.id ?? null}
  } catch (err) {
    return {error: String(err)}
  }
}

// Lee el shop metafield b2b.pricing (json string) para el display B2B en el Next.
// Devuelve el string del value o null. NO parsea (lo hace parseDiscountSpec,
// en lib/b2b/discountSpec.ts).
export async function getShopB2bPricing() {
  if (!STATIC_TOKEN && (!CLIENT_ID || !CLIENT_SECRET)) return null
  const query = `{ shop { metafield(namespace: "b2b", key: "pricing") { value } } }`
  try {
    const json = await adminData(query)
    return json?.data?.shop?.metafield?.value ?? null
  } catch {
    return null
  }
}

// --- Devoluciones (requiere scopes read_orders, read_returns, write_returns en la app) ---

// Devuelve un mapa orderGid -> returnStatus (p.ej. 'NONE', 'RETURN_REQUESTED', 'IN_PROGRESS').
// {} si falla (credenciales ausentes, scopes faltantes, error de red, etc).
export async function getOrdersReturnStatus(orderGids) {
  if (!Array.isArray(orderGids) || orderGids.length === 0) return {}
  const query = `
    query OrdersReturnStatus($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on Order { id returnStatus }
      }
    }
  `
  try {
    const json = await adminData(query, {ids: orderGids})
    if (json?.errors?.length) return {}
    const out = {}
    for (const node of json?.data?.nodes ?? []) {
      if (node?.id) out[node.id] = node.returnStatus ?? null
    }
    return out
  } catch {
    return {}
  }
}

// Items devolvibles de un pedido (fulfillmentLineItemId, title, maxQuantity).
// Devuelve {items} o {error} (mensaje legible, p.ej. falta de scope).
export async function getReturnableItems(orderGid) {
  const query = `
    query ReturnableItems($orderId: ID!) {
      returnableFulfillments(orderId: $orderId, first: 10) {
        edges {
          node {
            returnableFulfillmentLineItems(first: 50) {
              edges {
                node {
                  quantity
                  fulfillmentLineItem {
                    id
                    lineItem { title }
                  }
                }
              }
            }
          }
        }
      }
    }
  `
  try {
    const json = await adminData(query, {orderId: orderGid})
    if (json?.errors?.length) {
      return {error: json.errors.map((e) => e.message).join(', ')}
    }
    const items = []
    for (const f of json?.data?.returnableFulfillments?.edges ?? []) {
      for (const li of f?.node?.returnableFulfillmentLineItems?.edges ?? []) {
        const node = li?.node
        if (node?.fulfillmentLineItem?.id && node.quantity > 0) {
          items.push({
            fulfillmentLineItemId: node.fulfillmentLineItem.id,
            title: node.fulfillmentLineItem.lineItem?.title ?? '',
            maxQuantity: node.quantity,
          })
        }
      }
    }
    return {items}
  } catch (err) {
    return {error: String(err)}
  }
}

// Crea una solicitud de devolución. lineItems: [{fulfillmentLineItemId, quantity, returnReason, customerNote?}]
// Devuelve {ok: true} o {error} (mensaje legible, incluye userErrors de Shopify).
export async function createReturnRequest({orderGid, lineItems}) {
  const query = `
    mutation RequestReturn($input: ReturnRequestInput!) {
      returnRequest(input: $input) {
        return { id }
        userErrors { field message }
      }
    }
  `
  const variables = {
    input: {
      orderId: orderGid,
      returnLineItems: lineItems.map((l) => ({
        fulfillmentLineItemId: l.fulfillmentLineItemId,
        quantity: l.quantity,
        returnReason: l.returnReason,
        ...(l.customerNote ? {customerNote: l.customerNote} : {}),
      })),
    },
  }
  try {
    const json = await adminData(query, variables)
    if (json?.errors?.length) return {error: json.errors.map((e) => e.message).join(', ')}
    const errs = json?.data?.returnRequest?.userErrors ?? []
    if (errs.length) return {error: errs.map((e) => e.message).join(', ')}
    return {ok: true}
  } catch (err) {
    return {error: String(err)}
  }
}
