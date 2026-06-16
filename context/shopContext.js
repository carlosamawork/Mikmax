'use client'
import {createContext, useState, useEffect} from 'react'
import {
  cartCreate,
  cartCreateMultiple,
  cartLinesAdd,
  cartLinesAddMultiple,
  cartLinesUpdate,
  cartLinesRemove,
  cartDiscountCodesUpdate,
} from '../lib/shopify'
import {trackAddToCart} from '@/lib/analytics/track'
import {getStoreCurrency} from '@/lib/analytics/item'

const CartContext = createContext()

// Sync local cart items with Cart API line IDs using variant GID as key
function syncLineIds(localCart, apiLines) {
  const lineMap = new Map(
    apiLines.map(({id, merchandise}) => [merchandise.id, id])
  )
  return localCart.map(item => ({
    ...item,
    lineId: lineMap.get(item.store.gid) ?? item.lineId,
  }))
}

export default function ShopProvider({children}) {
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [cartId, setCartId] = useState('')
  const [checkoutUrl, setCheckoutUrl] = useState('')
  const [pageIsLoaded, setPageIsLoaded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  function handleDocumentClick(e) {
    const cartEl = document.getElementById('cart-slide')
    if (cartEl && e.target !== cartEl && !cartEl.contains(e.target)) {
      setCartOpen(false)
    }
  }

  useEffect(() => {
    if (localStorage.cart_v2) {
      const [savedCart, savedMeta] = JSON.parse(localStorage.cart_v2)
      if (Array.isArray(savedCart) && savedCart.length > 0) {
        setCart(savedCart)
      }
      if (savedMeta?.id) setCartId(savedMeta.id)
      if (savedMeta?.checkoutUrl) setCheckoutUrl(savedMeta.checkoutUrl)
    }

    document.addEventListener('click', handleDocumentClick, true)
    return () => document.removeEventListener('click', handleDocumentClick, true)
  }, [])

  function changePageIsLoaded() {
    setPageIsLoaded(true)
  }

  function saveToStorage(updatedCart, meta) {
    localStorage.setItem('cart_v2', JSON.stringify([updatedCart, meta]))
  }

  async function addToCart(newItem, quantity, productId, title, image) {
    const itemData = {...newItem, title, productId, variantQuantity: quantity, image}

    const atcItem = {
      id: productId || newItem.store.gid,
      name: title || '',
      price: typeof newItem.price === 'number' ? newItem.price : 0,
      quantity,
      variant: [newItem.color, newItem.size].filter((x) => x && x !== 'Default').join(' / ') || undefined,
      currency: getStoreCurrency(),
    }

    if (cart.length === 0) {
      setCartOpen(quantity === 1)
      setIsOpen(quantity > 1)

      try {
        const apiCart = await cartCreate(newItem.store.gid, quantity)
        if (!apiCart || apiCart.error) return

        const lines = apiCart.lines.edges.map(e => e.node)
        const [synced] = syncLineIds([itemData], lines)

        setCart([synced])
        setCartId(apiCart.id)
        setCheckoutUrl(apiCart.checkoutUrl)
        saveToStorage([synced], {id: apiCart.id, checkoutUrl: apiCart.checkoutUrl})
        trackAddToCart([atcItem])
      } catch (err) {
        console.error('cartCreate failed', err)
      }
    } else {
      setIsOpen(true)
      const existing = cart.find(item => item.store.gid === newItem.store.gid)

      try {
        let updatedCart
        let apiCart

        if (existing) {
          const newQty = existing.variantQuantity + quantity
          apiCart = await cartLinesUpdate(cartId, existing.lineId, newQty)
          updatedCart = cart.map(item =>
            item.store.gid === newItem.store.gid
              ? {...item, variantQuantity: newQty}
              : item
          )
        } else {
          apiCart = await cartLinesAdd(cartId, newItem.store.gid, quantity)
          if (apiCart && !apiCart.error) {
            const lines = apiCart.lines.edges.map(e => e.node)
            const [synced] = syncLineIds([itemData], lines)
            updatedCart = [...cart, synced]
          } else {
            return
          }
        }

        if (!apiCart || apiCart.error) return

        const meta = {id: cartId, checkoutUrl: apiCart.checkoutUrl ?? checkoutUrl}
        setCart(updatedCart)
        setCheckoutUrl(meta.checkoutUrl)
        saveToStorage(updatedCart, meta)
        trackAddToCart([atcItem])
      } catch (err) {
        console.error('addToCart failed', err)
      }
    }
  }

  async function addLookToCart(lookLines, discountCode) {
    if (!Array.isArray(lookLines) || lookLines.length === 0) return
    setCartOpen(true)

    const apiLines = lookLines.map((l) => ({merchandiseId: l.store.gid, quantity: l.quantity ?? 1}))
    const itemsData = lookLines.map((l) => ({...l, variantQuantity: l.quantity ?? 1}))

    try {
      let apiCart
      if (cart.length === 0) {
        apiCart = await cartCreateMultiple(apiLines)
      } else {
        apiCart = await cartLinesAddMultiple(cartId, apiLines)
      }
      if (!apiCart || apiCart.error) return

      const currentCartId = apiCart.id ?? cartId

      if (discountCode) {
        const withDiscount = await cartDiscountCodesUpdate(currentCartId, [discountCode])
        if (withDiscount && !withDiscount.error) apiCart = withDiscount
      }

      const lines = apiCart.lines.edges.map((e) => e.node)

      // Merge new items into existing local cart WITHOUT mutating state objects.
      const mergedLocal = cart.map((c) => ({...c}))
      for (const item of itemsData) {
        const existing = mergedLocal.find((c) => c.store.gid === item.store.gid)
        if (existing) existing.variantQuantity += item.variantQuantity
        else mergedLocal.push({...item})
      }
      const synced = syncLineIds(mergedLocal, lines)

      const meta = {id: currentCartId, checkoutUrl: apiCart.checkoutUrl ?? checkoutUrl}
      setCart(synced)
      setCartId(currentCartId)
      setCheckoutUrl(meta.checkoutUrl)
      saveToStorage(synced, meta)
      trackAddToCart(
        lookLines.map((l) => ({
          id: l.productId || l.store.gid,
          name: l.title || '',
          price: typeof l.price === 'number' ? l.price : 0,
          quantity: l.quantity ?? 1,
          currency: getStoreCurrency(),
        })),
      )
    } catch (err) {
      console.error('addLookToCart failed', err)
    }
  }

  async function updateCartItem(item, quantity) {
    if (!item?.lineId) return

    try {
      const apiCart = await cartLinesUpdate(cartId, item.lineId, quantity)
      if (!apiCart || apiCart.error) return

      const updatedCart = cart.map(c =>
        c.store.gid === item.store.gid ? {...c, variantQuantity: quantity} : c
      )
      const meta = {id: cartId, checkoutUrl: apiCart.checkoutUrl ?? checkoutUrl}
      setCart(updatedCart)
      setCheckoutUrl(meta.checkoutUrl)
      saveToStorage(updatedCart, meta)
    } catch (err) {
      console.error('updateCartItem failed', err)
    }
  }

  async function removeCartItem(variantGid) {
    const item = cart.find(c => c.store.gid === variantGid)
    if (!item?.lineId) return

    try {
      const apiCart = await cartLinesRemove(cartId, [item.lineId])
      if (!apiCart || apiCart.error) return

      const updatedCart = cart.filter(c => c.store.gid !== variantGid)
      const meta = {id: cartId, checkoutUrl: apiCart.checkoutUrl ?? checkoutUrl}
      setCart(updatedCart)
      setCheckoutUrl(meta.checkoutUrl)
      saveToStorage(updatedCart, meta)
    } catch (err) {
      console.error('removeCartItem failed', err)
    }
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        cartOpen,
        setCartOpen,
        isOpen,
        setIsOpen,
        addToCart,
        addLookToCart,
        cartId,
        checkoutUrl,
        removeCartItem,
        updateCartItem,
        changePageIsLoaded,
        pageIsLoaded,
        menuOpen,
        setMenuOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

const ShopConsumer = CartContext.Consumer

export {ShopConsumer, CartContext}
