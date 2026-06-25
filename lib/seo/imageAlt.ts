// Construye un alt descriptivo y con keywords naturales (tipo + material + color
// + marca) sin duplicar términos ni hacer keyword stuffing. Todos los textos se
// pasan ya localizados (título y opciones vienen localizados de Shopify).
//
//   buildImageAlt({type: 'Duvet cover', material: 'linen', color: 'Cardon Seed', title: 'Funda nórdica lino'})
//   → 'Funda nórdica lino Cardon Seed — Mikmax'
//
// La base es el título localizado cuando existe (evita mezclar idiomas); tipo y
// material solo se añaden si aportan algo que el título no contiene ya.
export function buildImageAlt(parts: {
  type?: string | null
  material?: string | null
  color?: string | null
  title?: string | null
  brand?: string
}): string {
  const {type, material, color, title, brand = 'Mikmax'} = parts
  const base = (title?.trim() || type?.trim() || '').trim()
  const extra: string[] = []
  const seen = base.toLowerCase()

  const add = (value?: string | null) => {
    const t = value?.trim()
    if (!t) return
    const low = t.toLowerCase()
    if (seen.includes(low)) return
    if (extra.some((e) => e.toLowerCase() === low)) return
    extra.push(t)
  }

  add(type)
  add(material)
  add(color)

  const main = [base, ...extra].filter(Boolean).join(' ')
  return main ? `${main} — ${brand}` : brand
}
