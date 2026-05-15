import { GraphQLClient } from 'graphql-request'

const domain = process.env.SHOPIFY_STORE_DOMAIN
const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESSTOKEN
const apiVersion = process.env.SHOPIFY_API_VERSION || '2025-10'

export async function shopifyData(query, variables) {
  if (!domain || !storefrontAccessToken) {
    throw new Error(
      'Missing Shopify env vars. Configure SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_ACCESSTOKEN.'
    )
  }

  const endpoint = `https://${domain}/api/${apiVersion}/graphql.json`

  const graphQLClient = new GraphQLClient(endpoint, {
    headers: {
      'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
    },
  })

  return await graphQLClient.request(query, variables)
}

// CART API

const CART_LINES_FRAGMENT = `
  id
  checkoutUrl
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
      input: { lines: [{ merchandiseId: variantGid, quantity }] },
    })
    return data.cartCreate.cart ?? null
  } catch (err) {
    return { error: err }
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
      lines: [{ merchandiseId: variantGid, quantity }],
    })
    return data.cartLinesAdd.cart ?? null
  } catch (err) {
    return { error: err }
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
      lines: [{ id: lineId, quantity }],
    })
    return data.cartLinesUpdate.cart ?? null
  } catch (err) {
    return { error: err }
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
    const data = await shopifyData(query, { cartId, lineIds })
    return data.cartLinesRemove.cart ?? null
  } catch (err) {
    return { error: err }
  }
}

// CUSTOMER

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
    return await shopifyData(query, { input: { email, password } })
  } catch (err) {
    return { error: err }
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
        orders(first: 10) {
          edges {
            node {
              id
              name
              orderNumber
              totalPrice { amount }
              processedAt
              statusUrl
              customerUrl
              lineItems(first: 250) {
                edges {
                  node {
                    title
                    quantity
                    variant {
                      id
                      title
                      priceV2 { amount }
                      image { src altText }
                      product { id handle }
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
    return await shopifyData(query, { token })
  } catch (err) {
    return { error: err }
  }
}

export async function resetPassword(id, resetToken, newPassword) {
  const query = `
    mutation customerReset($id: ID!, $input: CustomerResetInput!) {
      customerReset(id: $id, input: $input) {
        customer { id }
        customerAccessToken { accessToken }
        customerUserErrors { message }
      }
    }
  `
  try {
    const response = await shopifyData(query, {
      id: `gid://shopify/Customer/${id}`,
      input: { resetToken, password: newPassword },
    })
    if (response.customerReset.customerUserErrors.length === 0) {
      return { success: true }
    }
    return {
      success: false,
      message: response.customerReset.customerUserErrors[0].message,
    }
  } catch (error) {
    return { success: false, message: error }
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
  const data = await shopifyData(COLLECTION_PRODUCTS_QUERY, {
    handle,
    filters,
    sortKey,
    reverse,
    first,
    after,
  })
  const products = data?.collection?.products
  if (!products) return {nodes: [], pageInfo: {hasNextPage: false, endCursor: null}, filters: []}
  return products
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
  const data = await shopifyData(COLLECTION_FILTERS_QUERY, {handle, filters})
  return data?.collection?.products?.filters ?? []
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
    $filters: [ProductFilter!]
    $sortKey: SearchSortKeys
    $reverse: Boolean
    $first: Int!
    $after: String
  ) {
    search(
      query: ""
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
  query SearchFilters($filters: [ProductFilter!]) {
    search(query: "", types: PRODUCT, productFilters: $filters, first: 1) {
      productFilters {
        id
        label
        type
        values { id label count input }
      }
    }
  }
`

export async function getAllShopFilters({filters = []} = {}) {
  const data = await shopifyData(SEARCH_FILTERS_QUERY, {filters})
  return data?.search?.productFilters ?? []
}

export async function getAllShopProducts(
  filters = [],
  {sortKey = 'RELEVANCE', reverse = false} = {},
) {
  const all = []
  let after = null
  let hasNext = true
  while (hasNext) {
    const data = await shopifyData(SEARCH_PRODUCTS_QUERY, {
      filters,
      sortKey,
      reverse,
      first: 250,
      after,
    })
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
    })
  )
  return results.filter((p) => p !== null)
}
