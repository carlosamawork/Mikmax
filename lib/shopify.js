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
