import {GraphQLClient} from 'graphql-request'

const domain = process.env.SHOPIFY_STORE_DOMAIN
const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESSTOKEN
const apiVersion = process.env.SHOPIFY_API_VERSION || '2025-10'

const MAX_RETRIES = 2 // intentos totales = MAX_RETRIES + 1
const RETRY_BASE_MS = 300

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Durante incidencias de infraestructura, Shopify devuelve 404/5xx/429 de forma
// intermitente (ver shopifystatus.com) aunque la tienda, el token y la query
// sean correctos. Esos errores se reintentan; un error real de GraphQL
// (status 400, query inválida) NO se reintenta porque reintentar no lo arregla.
function isTransientShopifyError(err) {
  const status = err?.response?.status
  if (status == null) return true // error de red/timeout, sin respuesta HTTP
  return status === 429 || status === 404 || (status >= 500 && status <= 599)
}

export async function shopifyData(query, variables, {retries = MAX_RETRIES} = {}) {
  if (!domain || !storefrontAccessToken) {
    throw new Error(
      'Missing Shopify env vars. Configure SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_ACCESSTOKEN.',
    )
  }

  const endpoint = `https://${domain}/api/${apiVersion}/graphql.json`

  const graphQLClient = new GraphQLClient(endpoint, {
    headers: {
      'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
    },
  })

  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await graphQLClient.request(query, variables)
    } catch (err) {
      lastErr = err
      if (attempt === retries || !isTransientShopifyError(err)) break
      const delay = RETRY_BASE_MS * 2 ** attempt + Math.floor(Math.random() * 100)
      console.warn(
        `[shopify] error transitorio (status ${
          err?.response?.status ?? 'network'
        }), reintento ${attempt + 1}/${retries} en ${delay}ms`,
      )
      await sleep(delay)
    }
  }
  throw lastErr
}

// CART API

const CART_LINES_FRAGMENT = `
  id
  checkoutUrl
  discountCodes { code applicable }
  cost {
    subtotalAmount { amount currencyCode }
    totalAmount { amount currencyCode }
  }
  discountAllocations {
    discountedAmount { amount currencyCode }
    ... on CartAutomaticDiscountAllocation { title }
    ... on CartCodeDiscountAllocation { code }
  }
  lines(first: 100) {
    edges {
      node {
        id
        quantity
        merchandise {
          ... on ProductVariant {
            id
          }
        }
      }
    }
  }
`

export async function cartCreate(variantGid, quantity) {
  const query = `
    mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart { ${CART_LINES_FRAGMENT} }
        userErrors { field message }
      }
    }
  `
  try {
    const data = await shopifyData(query, {
      input: {lines: [{merchandiseId: variantGid, quantity}]},
    })
    return data.cartCreate.cart ?? null
  } catch (err) {
    return {error: err}
  }
}

export async function cartLinesAdd(cartId, variantGid, quantity) {
  const query = `
    mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { ${CART_LINES_FRAGMENT} }
        userErrors { field message }
      }
    }
  `
  try {
    const data = await shopifyData(query, {
      cartId,
      lines: [{merchandiseId: variantGid, quantity}],
    })
    return data.cartLinesAdd.cart ?? null
  } catch (err) {
    return {error: err}
  }
}

export async function cartLinesUpdate(cartId, lineId, quantity) {
  const query = `
    mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart { ${CART_LINES_FRAGMENT} }
        userErrors { field message }
      }
    }
  `
  try {
    const data = await shopifyData(query, {
      cartId,
      lines: [{id: lineId, quantity}],
    })
    return data.cartLinesUpdate.cart ?? null
  } catch (err) {
    return {error: err}
  }
}

export async function cartLinesRemove(cartId, lineIds) {
  const query = `
    mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart { ${CART_LINES_FRAGMENT} }
        userErrors { field message }
      }
    }
  `
  try {
    const data = await shopifyData(query, {cartId, lineIds})
    return data.cartLinesRemove.cart ?? null
  } catch (err) {
    return {error: err}
  }
}

export async function cartCreateMultiple(lines) {
  const query = `
    mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart { ${CART_LINES_FRAGMENT} }
        userErrors { field message }
      }
    }
  `
  try {
    const data = await shopifyData(query, {
      input: {
        lines: lines.map((l) => ({merchandiseId: l.merchandiseId, quantity: l.quantity})),
      },
    })
    return data.cartCreate.cart ?? null
  } catch (err) {
    return {error: err}
  }
}

export async function cartLinesAddMultiple(cartId, lines) {
  const query = `
    mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { ${CART_LINES_FRAGMENT} }
        userErrors { field message }
      }
    }
  `
  try {
    const data = await shopifyData(query, {
      cartId,
      lines: lines.map((l) => ({merchandiseId: l.merchandiseId, quantity: l.quantity})),
    })
    return data.cartLinesAdd.cart ?? null
  } catch (err) {
    return {error: err}
  }
}

export async function cartDiscountCodesUpdate(cartId, codes) {
  const query = `
    mutation cartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]) {
      cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
        cart { ${CART_LINES_FRAGMENT} }
        userErrors { field message }
      }
    }
  `
  try {
    const data = await shopifyData(query, {cartId, discountCodes: codes})
    return data.cartDiscountCodesUpdate.cart ?? null
  } catch (err) {
    return {error: err}
  }
}

// Asocia el carrito a un cliente (token de acceso) para que el checkout hosted salga
// logueado y con la dirección precargada. buyerIdentity = {customerAccessToken}.
export async function cartBuyerIdentityUpdate(cartId, buyerIdentity) {
  const query = `
    mutation cartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
      cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
        cart { ${CART_LINES_FRAGMENT} }
        userErrors { field message }
      }
    }
  `
  try {
    const data = await shopifyData(query, {cartId, buyerIdentity})
    return data.cartBuyerIdentityUpdate.cart ?? null
  } catch (err) {
    return {error: err}
  }
}

// Selecciona la(s) dirección(es) de entrega del carrito (reemplaza las existentes).
// Con {address:{copyFromCustomerAddressId}, selected:true} copia la dirección guardada del
// cliente al formulario PRINCIPAL del checkout (nombre + dirección).
export async function cartDeliveryAddressesReplace(cartId, addresses) {
  const query = `
    mutation cartDeliveryAddressesReplace($cartId: ID!, $addresses: [CartSelectableAddressInput!]!) {
      cartDeliveryAddressesReplace(cartId: $cartId, addresses: $addresses) {
        cart { ${CART_LINES_FRAGMENT} }
        userErrors { field message }
      }
    }
  `
  try {
    const data = await shopifyData(query, {cartId, addresses})
    return data.cartDeliveryAddressesReplace.cart ?? null
  } catch (err) {
    return {error: err}
  }
}

// CUSTOMER

export async function customerCreate(
  email,
  password,
  {firstName, lastName, acceptsMarketing} = {},
) {
  const query = `
    mutation customerCreate($input: CustomerCreateInput!) {
      customerCreate(input: $input) {
        customer { id email }
        customerUserErrors { field message code }
      }
    }
  `
  try {
    return await shopifyData(query, {
      input: {
        email,
        password,
        ...(firstName && {firstName}),
        ...(lastName && {lastName}),
        ...(acceptsMarketing != null && {acceptsMarketing}),
      },
    })
  } catch (err) {
    return {error: err}
  }
}

export async function login(email, password) {
  const query = `
    mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
      customerAccessTokenCreate(input: $input) {
        customerAccessToken {
          accessToken
          expiresAt
        }
        customerUserErrors {
          field
          message
        }
      }
    }
  `
  try {
    return await shopifyData(query, {input: {email, password}})
  } catch (err) {
    return {error: err}
  }
}

export async function getUser(token) {
  const query = `
    query getCustomer($token: String!) {
      customer(customerAccessToken: $token) {
        id
        firstName
        lastName
        acceptsMarketing
        email
        phone
        defaultAddress {
          id
          address1
          address2
          city
          zip
          country
          province
          phone
        }
        metafield(namespace: "custom", key: "birthday") {
          value
        }
        b2bValidated: metafield(namespace: "b2b", key: "validated") {
          value
        }
        b2bClientType: metafield(namespace: "b2b", key: "client_type") {
          value
        }
        orders(first: 10, sortKey: PROCESSED_AT, reverse: true) {
          edges {
            node {
              id
              name
              orderNumber
              financialStatus
              totalPrice { amount currencyCode }
              processedAt
              statusUrl
              customerUrl
              shippingAddress { name firstName lastName }
              lineItems(first: 250) {
                edges {
                  node {
                    title
                    quantity
                    variant {
                      id
                      title
                      priceV2 { amount currencyCode }
                      image { src altText }
                      product {
                        id
                        handle
                        productType
                        collections(first: 20) { edges { node { handle title } } }
                      }
                    }
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
    return await shopifyData(query, {token})
  } catch (err) {
    return {error: err}
  }
}

export async function customerRecover(email) {
  const query = `
    mutation customerRecover($email: String!) {
      customerRecover(email: $email) {
        customerUserErrors { field message code }
      }
    }
  `
  try {
    return await shopifyData(query, {email})
  } catch (err) {
    return {error: err}
  }
}

export async function resetPassword(id, resetToken, newPassword) {
  const query = `
    mutation customerReset($id: ID!, $input: CustomerResetInput!) {
      customerReset(id: $id, input: $input) {
        customer { id }
        customerAccessToken { accessToken expiresAt }
        customerUserErrors { message }
      }
    }
  `
  try {
    const response = await shopifyData(query, {
      id: `gid://shopify/Customer/${id}`,
      input: {resetToken, password: newPassword},
    })
    if (response.customerReset.customerUserErrors.length === 0) {
      return {success: true, token: response.customerReset.customerAccessToken}
    }
    return {
      success: false,
      message: response.customerReset.customerUserErrors[0].message,
    }
  } catch (error) {
    return {success: false, message: error}
  }
}

export async function customerUpdate(token, customer) {
  const query = `
    mutation customerUpdate($token: String!, $customer: CustomerUpdateInput!) {
      customerUpdate(customerAccessToken: $token, customer: $customer) {
        customer { id }
        customerAccessToken { accessToken expiresAt }
        customerUserErrors { field message code }
      }
    }
  `
  try {
    return await shopifyData(query, {token, customer})
  } catch (err) {
    return {error: err}
  }
}

export async function customerAddressCreate(token, address) {
  const query = `
    mutation customerAddressCreate($token: String!, $address: MailingAddressInput!) {
      customerAddressCreate(customerAccessToken: $token, address: $address) {
        customerAddress { id }
        customerUserErrors { field message code }
      }
    }
  `
  try {
    return await shopifyData(query, {token, address})
  } catch (err) {
    return {error: err}
  }
}

export async function customerAddressUpdate(token, id, address) {
  const query = `
    mutation customerAddressUpdate($token: String!, $id: ID!, $address: MailingAddressInput!) {
      customerAddressUpdate(customerAccessToken: $token, id: $id, address: $address) {
        customerAddress { id }
        customerUserErrors { field message code }
      }
    }
  `
  try {
    return await shopifyData(query, {token, id, address})
  } catch (err) {
    return {error: err}
  }
}

export async function customerDefaultAddressUpdate(token, addressId) {
  const query = `
    mutation customerDefaultAddressUpdate($token: String!, $addressId: ID!) {
      customerDefaultAddressUpdate(customerAccessToken: $token, addressId: $addressId) {
        customer { id }
        customerUserErrors { field message code }
      }
    }
  `
  try {
    return await shopifyData(query, {token, addressId})
  } catch (err) {
    return {error: err}
  }
}

export async function logoutToken(token) {
  const query = `
    mutation customerAccessTokenDelete($token: String!) {
      customerAccessTokenDelete(customerAccessToken: $token) {
        deletedAccessToken
        userErrors { field message }
      }
    }
  `
  try {
    return await shopifyData(query, {token})
  } catch (err) {
    return {error: err}
  }
}

export async function getCustomerWishlist(token) {
  const query = `
    query getWishlist($token: String!) {
      customer(customerAccessToken: $token) {
        id
        metafield(namespace: "custom", key: "wishlist") { value }
      }
    }
  `
  try {
    return await shopifyData(query, {token})
  } catch (err) {
    return {error: err}
  }
}

// --- Collection archive helpers (added 2026-05-11) ---

const COLLECTIONS_WITH_PRODUCTS_QUERY = `
  query CollectionsWithProducts($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        handle
        products(first: 1) { nodes { id } }
      }
    }
  }
`

export async function getCollectionHandlesWithProducts() {
  const handles = []
  let after = null
  for (let i = 0; i < 10; i++) {
    const data = await shopifyData(COLLECTIONS_WITH_PRODUCTS_QUERY, {first: 250, after})
    const conn = data?.collections
    if (!conn) break
    for (const node of conn.nodes ?? []) {
      if ((node.products?.nodes?.length ?? 0) > 0 && node.handle) {
        handles.push(node.handle)
      }
    }
    if (!conn.pageInfo?.hasNextPage) break
    after = conn.pageInfo.endCursor
  }
  return handles
}

const COLLECTION_META_QUERY = `
  query CollectionMeta($handle: String!) {
    collection(handle: $handle) {
      id
      title
      handle
      descriptionHtml
      image { url altText }
    }
  }
`

export async function getCollectionMeta(handle) {
  const data = await shopifyData(COLLECTION_META_QUERY, {handle})
  return data?.collection ?? null
}

// NOTE (2026-05-12): custom.gallery metafield probed via Storefront API
// (namespace="custom", key="gallery") on both Product and ProductVariant.
// The field resolves (no schema error) but returns null on all 66 products
// currently in the store — i.e. either the metafield definition is not
// exposed to the Storefront API or no product has it populated yet. The
// PDP query keeps the assumed shape (`list.file_reference` -> MediaImage)
// per spec; if real data ever differs, adjust the extractor in buildProductView.
const PRODUCT_CARD_FRAGMENT = `
  fragment ProductCard on Product {
    id
    handle
    title
    tags
    colorPattern: metafield(namespace: "shopify", key: "color-pattern") {
      type
      value
      references(first: 25) {
        nodes {
          ... on Metaobject {
            id
            handle
            type
            fields {
              key
              value
              reference {
                ... on Metaobject {
                  id
                  handle
                  fields { key value }
                }
              }
            }
          }
        }
      }
    }
    coverMaterial: metafield(namespace: "shopify", key: "cover-material") {
      references(first: 10) {
        nodes { ... on Metaobject { fields { key value } } }
      }
    }
    fillerMaterial: metafield(namespace: "shopify", key: "filler-material") {
      references(first: 10) {
        nodes { ... on Metaobject { fields { key value } } }
      }
    }
    fabric: metafield(namespace: "shopify", key: "fabric") {
      references(first: 10) {
        nodes { ... on Metaobject { fields { key value } } }
      }
    }
    featuredImage { url altText }
    priceRange {
      minVariantPrice { amount }
      maxVariantPrice { amount }
    }
    compareAtPriceRange {
      maxVariantPrice { amount }
    }
    options {
      name
      values
    }
    variants(first: 100) {
      nodes {
        id
        availableForSale
        image { url altText }
        price { amount }
        compareAtPrice { amount }
        selectedOptions { name value }
        gallery: metafield(namespace: "custom", key: "gallery") {
          references(first: 2) {
            nodes {
              ... on MediaImage {
                image { url altText }
              }
            }
          }
        }
      }
    }
  }
`

const COLLECTION_PRODUCTS_QUERY = `
  ${PRODUCT_CARD_FRAGMENT}
  query CollectionProducts(
    $handle: String!
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
    $first: Int!
    $after: String
  ) {
    collection(handle: $handle) {
      products(
        filters: $filters
        sortKey: $sortKey
        reverse: $reverse
        first: $first
        after: $after
      ) {
        pageInfo { hasNextPage endCursor }
        nodes { ...ProductCard }
        filters {
          id
          label
          type
          values { id label count input }
        }
      }
    }
  }
`

export async function getCollectionProducts(
  handle,
  {filters = [], sortKey = 'COLLECTION_DEFAULT', reverse = false, first = 24, after = null} = {},
) {
  const empty = {nodes: [], pageInfo: {hasNextPage: false, endCursor: null}, filters: []}
  try {
    const data = await shopifyData(COLLECTION_PRODUCTS_QUERY, {
      handle,
      filters,
      sortKey,
      reverse,
      first,
      after,
    })
    return data?.collection?.products ?? empty
  } catch (err) {
    console.error(`[shopify] getCollectionProducts("${handle}") falló:`, err?.message ?? err)
    return empty
  }
}

const COLLECTION_FILTERS_QUERY = `
  query CollectionFilters($handle: String!, $filters: [ProductFilter!]) {
    collection(handle: $handle) {
      products(filters: $filters, first: 1) {
        filters {
          id
          label
          type
          values { id label count input }
        }
      }
    }
  }
`

export async function getCollectionFilters(handle, {filters = []} = {}) {
  try {
    const data = await shopifyData(COLLECTION_FILTERS_QUERY, {handle, filters})
    return data?.collection?.products?.filters ?? []
  } catch (err) {
    console.error(`[shopify] getCollectionFilters("${handle}") falló:`, err?.message ?? err)
    return []
  }
}

/**
 * Iterates the collection in batches of 250 to materialize all matching products
 * for the given filters and sort. The full set is expanded to per-color cards,
 * filtered and re-sorted in JS by the caller, so the Shopify sort here is mainly
 * a hint (it determines the order of products before card expansion).
 */
export async function getAllProductsForFilters(
  handle,
  filters = [],
  {sortKey = 'COLLECTION_DEFAULT', reverse = false} = {},
) {
  const all = []
  let after = null
  let hasNext = true
  while (hasNext) {
    const page = await getCollectionProducts(handle, {
      filters,
      sortKey,
      reverse,
      first: 250,
      after,
    })
    all.push(...page.nodes)
    hasNext = page.pageInfo.hasNextPage
    after = page.pageInfo.endCursor
    if (all.length >= 5000) break // safety cap
  }
  return all
}

// --- Virtual "all products" handle (used by /shop index) ---
// `collection(handle: "all")` does not exist in Shopify, so we use the
// top-level `search` endpoint with `types: PRODUCT` to mirror the collection
// API surface. `search.productFilters` also exposes variant option facets
// (e.g. `filter.v.option.size`) without requiring Search & Discovery setup.

const SEARCH_PRODUCTS_QUERY = `
  ${PRODUCT_CARD_FRAGMENT}
  query SearchProducts(
    $query: String = ""
    $filters: [ProductFilter!]
    $sortKey: SearchSortKeys
    $reverse: Boolean
    $first: Int!
    $after: String
  ) {
    search(
      query: $query
      types: PRODUCT
      productFilters: $filters
      sortKey: $sortKey
      reverse: $reverse
      first: $first
      after: $after
    ) {
      pageInfo { hasNextPage endCursor }
      nodes { ... on Product { ...ProductCard } }
      productFilters {
        id
        label
        type
        values { id label count input }
      }
    }
  }
`

const SEARCH_FILTERS_QUERY = `
  query SearchFilters($query: String = "", $filters: [ProductFilter!]) {
    search(query: $query, types: PRODUCT, productFilters: $filters, first: 1) {
      productFilters {
        id
        label
        type
        values { id label count input }
      }
    }
  }
`

export async function getAllShopFilters({filters = [], query = ''} = {}) {
  try {
    const data = await shopifyData(SEARCH_FILTERS_QUERY, {filters, query})
    return data?.search?.productFilters ?? []
  } catch (err) {
    console.error('[shopify] getAllShopFilters falló:', err?.message ?? err)
    return []
  }
}

export async function getAllShopProducts(
  filters = [],
  {sortKey = 'RELEVANCE', reverse = false} = {},
  query = '',
) {
  const all = []
  let after = null
  let hasNext = true
  while (hasNext) {
    let data
    try {
      data = await shopifyData(SEARCH_PRODUCTS_QUERY, {
        query,
        filters,
        sortKey,
        reverse,
        first: 250,
        after,
      })
    } catch (err) {
      console.error('[shopify] getAllShopProducts (página) falló:', err?.message ?? err)
      break
    }
    const search = data?.search
    if (!search) break
    all.push(...search.nodes)
    hasNext = search.pageInfo.hasNextPage
    after = search.pageInfo.endCursor
    if (all.length >= 5000) break
  }
  return all
}

// --- PDP helpers (added 2026-05-12) ---

const PRODUCT_DETAIL_FRAGMENT = `
  fragment ProductDetail on Product {
    id
    handle
    title
    descriptionHtml
    productType
    vendor
    tags
    featuredImage { url altText width height }
    priceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    compareAtPriceRange {
      maxVariantPrice { amount currencyCode }
    }
    options { name values }
    colorPattern: metafield(namespace: "shopify", key: "color-pattern") {
      type
      value
      references(first: 25) {
        nodes {
          ... on Metaobject {
            id
            handle
            type
            fields { key value }
          }
        }
      }
    }
    seo { title description }
    variants(first: 100) {
      nodes {
        id
        availableForSale
        image { url altText width height }
        price { amount currencyCode }
        compareAtPrice { amount currencyCode }
        selectedOptions { name value }
        gallery: metafield(namespace: "custom", key: "gallery") {
          type
          value
          references(first: 25) {
            nodes {
              ... on MediaImage {
                image { url altText width height }
              }
            }
          }
        }
      }
    }
  }
`

const PRODUCT_DETAIL_QUERY = `
  ${PRODUCT_DETAIL_FRAGMENT}
  query ProductDetail($handle: String!) {
    product(handle: $handle) { ...ProductDetail }
  }
`

export async function getProductDetail(handle) {
  const data = await shopifyData(PRODUCT_DETAIL_QUERY, {handle})
  return data?.product ?? null
}

const PRODUCT_CARD_BY_HANDLE_QUERY = `
  query ProductCardByHandle($handle: String!) {
    product(handle: $handle) {
      id
      handle
      title
      featuredImage { url altText }
      priceRange {
        minVariantPrice { amount }
        maxVariantPrice { amount }
      }
    }
  }
`

export async function getProductCards(handles) {
  if (!Array.isArray(handles) || handles.length === 0) return []
  const results = await Promise.all(
    handles.map(async (handle) => {
      try {
        const data = await shopifyData(PRODUCT_CARD_BY_HANDLE_QUERY, {handle})
        return data?.product ?? null
      } catch {
        return null
      }
    }),
  )
  return results.filter((p) => p !== null)
}

const PRODUCT_CARD_FULL_BY_HANDLE_QUERY = `
  ${PRODUCT_CARD_FRAGMENT}
  query ProductCardFullByHandle($handle: String!) {
    product(handle: $handle) { ...ProductCard }
  }
`

export async function getProductCardsByHandles(handles) {
  if (!Array.isArray(handles) || handles.length === 0) return []
  const results = await Promise.all(
    handles.map(async (handle) => {
      const data = await shopifyData(PRODUCT_CARD_FULL_BY_HANDLE_QUERY, {handle})
      return data?.product ?? null
    }),
  )
  return results.filter(Boolean)
}
