// lib/shop/editorialLayout.ts
//
// Layout determinista de la Vista 2 del Shop (grid editorial de 4 columnas).
// Ciclo de 3 bloques que se repite. Cada bloque ocupa 2 filas y va seguido de una
// FILA COMPLETA de 4 productos sin destacar (separador) → 3 filas por bloque:
//   Bloque 1: destacado 2×2 a la IZQ (cols 1-2) + 4 productos a la DER (cols 3-4)
//   Bloque 2: destacado 2×2 a la DER (cols 3-4) + 4 productos a la IZQ (cols 1-2)
//   Bloque 3: destacado 2×2 a la IZQ + 1 producto en la esquina OPUESTA (col 4,
//             fila sup, sin tocar el destacado) + hueco blanco entre ambos
//   ...y debajo de cada bloque, una fila de 4 productos.
// Cada destacado es un PRODUCTO grande (usa su 2ª imagen) salvo que ese slot haya
// sido elegido para una IMAGEN de la lista de la colección. Las imágenes caen en
// los primeros slots destacados, en orden aleatorio pero ESTABLE (semilla por
// colección) para no saltar entre render SSR e infinite scroll.
import type {EditorialImage, ProductCardData} from '@/types/shop'

// Ventana de slots destacados iniciales donde pueden caer las imágenes.
const IMAGE_POOL = 6

export type V2Slot =
  | {kind: 'product'; key: string; product: ProductCardData; col: number; row: number}
  | {kind: 'featured-product'; key: string; product: ProductCardData; col: number; row: number}
  | {kind: 'featured-image'; key: string; image: EditorialImage; col: number; row: number}
  | {kind: 'spacer'; key: string; col: number; row: number}

// Hash estable de string → entero (para la semilla del PRNG).
function hashSeed(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// PRNG determinista (mulberry32).
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Elige, de forma aleatoria pero estable, qué slots destacados (índice de bloque)
// llevan imagen. Devuelve un mapa slotDestacado → índice de imagen.
function pickImageSlots(count: number, seedStr: string): Map<number, number> {
  const map = new Map<number, number>()
  if (count <= 0) return map
  const pool = Math.max(IMAGE_POOL, count)
  const idx = Array.from({length: pool}, (_, i) => i)
  const rnd = mulberry32(hashSeed(seedStr))
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  idx
    .slice(0, count)
    .sort((a, b) => a - b)
    .forEach((slot, k) => map.set(slot, k))
  return map
}

export function buildVista2Layout(
  products: ProductCardData[],
  editorials: EditorialImage[],
  seedStr: string,
): V2Slot[] {
  const slots: V2Slot[] = []
  const imageSlots = pickImageSlots(editorials.length, seedStr)
  let qi = 0
  const next = (): ProductCardData | undefined => products[qi++]

  let block = 0
  let row = 1
  while (qi < products.length || imageSlots.has(block)) {
    const type = block % 3
    const fCol = type === 1 ? 3 : 1 // bloque 2 → destacado a la derecha

    // --- Destacado (imagen o producto grande) ---
    const imgK = imageSlots.get(block)
    if (imgK !== undefined) {
      slots.push({kind: 'featured-image', key: `fi-${block}`, image: editorials[imgK], col: fCol, row})
    } else {
      const p = next()
      if (!p) break
      slots.push({kind: 'featured-product', key: `fp-${block}`, product: p, col: fCol, row})
    }

    // --- Productos del bloque (junto al destacado) ---
    if (type === 2) {
      // 1 producto en la fila superior, en el EXTREMO opuesto al destacado (sin
      // tocarlo); el hueco queda entre el destacado y ese producto. El resto, hueco.
      const prodCol = fCol === 1 ? 4 : 1
      const empties = fCol === 1 ? [[3, row], [3, row + 1], [4, row + 1]] : [[2, row], [1, row + 1], [2, row + 1]]
      const p = next()
      if (p) slots.push({kind: 'product', key: p.id, product: p, col: prodCol, row})
      else empties.unshift([prodCol, row])
      for (const [c, r] of empties) slots.push({kind: 'spacer', key: `sp-${block}-${c}-${r}`, col: c, row: r})
    } else {
      const cols = fCol === 1 ? [3, 4] : [1, 2]
      for (const r of [row, row + 1]) {
        for (const c of cols) {
          const p = next()
          if (p) slots.push({kind: 'product', key: p.id, product: p, col: c, row: r})
          else slots.push({kind: 'spacer', key: `sp-${block}-${c}-${r}`, col: c, row: r})
        }
      }
    }

    // --- Fila separadora: 4 productos sin destacar debajo del bloque ---
    const sepRow = row + 2
    for (const c of [1, 2, 3, 4]) {
      const p = next()
      if (!p) break
      slots.push({kind: 'product', key: p.id, product: p, col: c, row: sepRow})
    }

    block++
    row += 3
  }
  return slots
}
