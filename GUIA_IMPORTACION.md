# Guía de importación del catálogo — Mikmax

Esta guía explica, paso a paso, **cómo preparar el catálogo para subirlo a la web**:

1. Qué información va en el **CSV de Shopify** y cómo rellenar cada columna.
2. Qué información se añade después en **Sanity** (el panel de contenidos en `/admin`).
3. Qué hay que **revisar y corregir en el CSV actual** (`shopify_import.csv`) antes de importarlo.

> **Idea clave:** Shopify guarda el catálogo "duro" (precio, stock, tallas, colores). Sanity guarda el contenido editorial (storytelling, imágenes de campaña, looks, sets). Ambos sistemas se conectan automáticamente por el **Handle** del producto, así que no hay que pegar IDs ni hacer nada manual para enlazarlos.

---

## 1. Cómo se reparte el trabajo

| En Shopify (CSV) pones… | En Sanity (Studio) pones… |
|---|---|
| Título del producto | Descripción del producto (texto largo con formato) |
| Descripción HTML básica | Propiedades del material |
| Precio y precio "antes" tachado | Recomendaciones de lavado |
| Tallas y colores (variantes) | Uso recomendado |
| SKU, código de barras, stock | Imágenes adicionales editoriales (galería de campaña, hotspots, captions) |
| Peso y unidad de peso | Vídeos del producto |
| Imagen principal del producto | Looks y Sets (combinaciones editoriales con descuento) |
| Tags, vendor, tipo de producto | Jerarquía de colecciones (colección padre/hija) |
| SEO (título y descripción base) | Imágenes destacadas de colección para Vista 2 |
| Imagen de la colección | SEO editorial (override para Google) |
| Estado (activo / borrador) | |

**Cómo se enlazan:** el sistema sincroniza Shopify con Sanity automáticamente usando el campo **Handle** del CSV. Una vez importado el CSV en Shopify, en pocos minutos aparecerán los productos en Sanity listos para enriquecer.

> ⚠️ **Nunca cambies el `Handle` de un producto ya importado.** Si lo cambias, Shopify lo trata como producto nuevo y se pierde la conexión con todo el contenido editorial que ya hubieras añadido en Sanity.

---

## 2. El CSV de Shopify — cómo rellenar cada columna

El CSV tiene **una fila por variante**. Si un producto tiene 3 tallas y 2 colores, son 6 filas. **Solo la primera fila de cada producto** lleva el título, la descripción, el vendor, etc.; las filas siguientes solo llevan los datos de la variante.

### Columnas obligatorias o muy recomendadas

| Columna | Cómo rellenarla |
|---|---|
| **Handle** | Identificador único del producto, en minúsculas y con guiones (ej. `mantel-lino-castell`). Es lo que aparece en la URL del producto. **Una vez puesto, no se cambia nunca.** |
| **Title** | Nombre comercial del producto. Solo en la primera fila de cada Handle. |
| **Body (HTML)** | Descripción del producto con HTML básico (`<p>`, `<h2>`, `<ul>`…). Importante: **no usar `\n` literal** — los saltos de línea van como `<br>` o como nuevos párrafos. |
| **Vendor** | Nombre del proveedor/marca. Para casi todo el catálogo será `Mikmax`. |
| **Type** | Tipo de producto (ej. `Mantel`, `Jersey`, `Pijama`, `Foulard`). Sirve para organizar y filtrar. |
| **Tags** | Palabras clave separadas por coma (ej. `mantel,lino,mesa,navidad`). **Importante:** las colecciones automáticas se construyen por tags. Sin tags no hay colecciones inteligentes. |
| **Published** | `True` para que sea visible en la tienda, `False` si todavía no quieres publicarlo. |
| **Option1 Name / Option1 Value** | Nombre y valor de la primera opción (ej. `Talla` / `M`). Si el producto no tiene variantes, escribe `Title` / `Default Title`. |
| **Option2 Name / Option2 Value** | Igual, para la segunda opción (ej. `Color` / `Castell`). Vacío si no aplica. |
| **Option3 Name / Option3 Value** | Tercera opción si existe. Máximo 3. |
| **Variant SKU** | Código único de cada variante. Imprescindible para inventario y trazabilidad. |
| **Variant Grams** | **Peso en gramos**, número entero (ej. `500` para medio kilo, `1000` para 1 kg). No uses decimales ni kg en este campo. |
| **Variant Weight Unit** | `g`, `kg`, `lb` u `oz`. Es solo cómo se muestra; el peso real va en `Variant Grams`. |
| **Variant Inventory Tracker** | `shopify` (que el stock lo controle Shopify). |
| **Variant Inventory Qty** | Unidades disponibles. Si pones `0`, el producto saldrá agotado. |
| **Variant Inventory Policy** | `deny` para que no se pueda vender sin stock; `continue` para permitir reservas/pre-venta. |
| **Variant Fulfillment Service** | `manual` (lo enviáis vosotros). |
| **Variant Price** | Precio con punto decimal (ej. `199.00`). |
| **Variant Compare At Price** | Precio "antes" tachado (ej. `249.00`). Vacío si no hay rebaja. |
| **Variant Requires Shipping** | `True` para productos físicos. |
| **Variant Taxable** | `True` si lleva IVA. |
| **Variant Barcode** | Código de barras EAN/UPC si lo tienes. Opcional. |
| **Image Src** | URL pública de la imagen. Para varias imágenes, repite el Handle en filas extra solo para imágenes. |
| **Image Position** | Número entero (`1`, `2`, `3`…). **No `1.0`.** |
| **Image Alt Text** | Texto descriptivo de la imagen (accesibilidad y SEO). Que no sea idéntico al título en todas. |
| **Gift Card** | `False` (salvo que sea una tarjeta regalo). |
| **SEO Title** | Título que aparecerá en Google. Si lo dejas vacío, Shopify usa el `Title`. |
| **SEO Description** | Descripción que aparece en Google (máx. 160 caracteres aprox.). |
| **Status** | `active` (visible) / `draft` (borrador) / `archived` (archivado). Solo se rellena en la primera fila. |

---

## 3. Qué se añade en Sanity Studio (después de importar)

Una vez el CSV está cargado en Shopify y la sincronización con Sanity ha terminado, los productos aparecen en `/admin` listos para enriquecer.

### En cada producto puedes añadir (todo opcional, todo editorial):

Cada producto tiene **cuatro campos de texto enriquecido** independientes, pensados para que la información salga estructurada en la ficha:

- **Descripción** — texto comercial / storytelling del producto.
- **Propiedades del material** — composición, gramaje, origen, certificaciones.
- **Recomendaciones de lavado** — temperatura, planchado, secado, etc.
- **Uso recomendado** — situaciones, estilos o estancias para los que está pensado.

Los cuatro campos comparten el mismo **editor enriquecido**, con:

- Estilos de párrafo: Normal, H1–H6 y cita (Quote).
- Listas con viñetas y numeradas.
- Negrita (Strong) e itálica (Italic).
- **Color del texto:** dos opciones, **Negro** y **Gris**, para destacar fragmentos.
- Enlaces (a producto del catálogo, email externo o URL externa).

Además del texto, cada producto admite:

- **Imágenes adicionales:** galería de fotos de campaña/lifestyle, distintas a las imágenes "ficha" que pusiste en Shopify. Cada imagen puede tener variantes:
  - *Simple* (solo imagen).
  - *Caption* (con pie de foto).
  - *Call to action* (con botón superpuesto).
  - *Hotspots* (puntos clicables que muestran otros productos del catálogo).
  - *Product tags* (lista de productos asociados a la imagen).
- **Vídeos:** título, miniatura y URL del vídeo.
- **SEO editorial:** si quieres reescribir el título/descripción para Google distintos de los del CSV, puedes hacerlo aquí (si lo dejas vacío, se usa lo del CSV).

### En cada colección puedes añadir:

La página de colección es **una rejilla de productos** (los que la componen en Shopify). La maqueta es siempre la misma. Los únicos campos editoriales en Sanity son:

- **Colección padre:** referencia opcional a otra colección. Permite agrupar en jerarquía (ej. *Manteles* como hija de *Mesa*). Es solo navegacional — Shopify no se entera. Útil para construir breadcrumbs, URLs anidadas o agrupaciones en el MegaMenu. Soporta varios niveles si se encadenan referencias (`Mesa → Manteles → Manteles de lino`).
- **Imágenes destacadas (Vista 2):** galería de imágenes editoriales que se intercalan dentro del listado de productos. **Solo se muestran en la Vista 2** de la página de colección. En la vista por defecto la página es una lista limpia de productos.
- **SEO editorial:** override del título/descripción para Google.

> **Imagen de la colección en el menú/hover:** se usa la imagen que ya rellenas en Shopify (campo "Collection image" en Shopify Admin). Llega a Sanity automáticamente vía `store.imageUrl` y desde ahí la lee el frontend. **No hay que subir ninguna imagen extra en Sanity** para esto.

### Looks y Sets (100% en Sanity, no van por CSV)

Los **Looks** y **Sets** son combinaciones editoriales de varios productos con un precio cerrado o un descuento. Se crean enteramente en Sanity:

- **Título y slug** (obligatorios).
- **Imágenes editoriales** (mínimo 1).
- **Componentes:** mínimo 2 variantes del catálogo Shopify (se eligen de un desplegable).
- **Precio fijo** del bundle (obligatorio).
- **Precio "antes" tachado** (opcional).
- **Estrategia de descuento:** restar cantidad fija a la suma, restar porcentaje, o precio cerrado que ignora la suma.
- **Color del set** (obligatorio en sets — color común a todos los componentes).
- **SEO** (opcional).

---

## 4. Revisión del CSV actual (`shopify_import.csv`)

El CSV que migrasteis desde WooCommerce tiene **253 productos en 1.398 filas**. Hay varias cosas que conviene **arreglar antes de importarlo**, porque tal cual está dará problemas:

### 🔴 Errores que rompen la importación

1. **Producto `ada` (24 variantes) y `adela`: todas las variantes con la misma opción `Default Title`**
   Cada fila tiene un SKU distinto (`PYADALC`, `PYADAMC`, `PYADASC`, `PYADAXLC`, `PYADALE`…) pero todas indican `Option1 Name = Title` y `Option1 Value = Default Title`.
   **Qué pasa:** Shopify agrupa variantes por la combinación de opciones. Como todas tienen "Default Title", colapsará las 24 variantes en 1 sola.
   **Cómo arreglarlo:** los SKUs ya indican que hay dos opciones reales, **Talla** (`L`/`M`/`S`/`XL`) y **Color** (la última letra: `C`, `E`, `G`, `S`). Hay que reconstruir las columnas `Option1 Name`/`Option1 Value` (Talla) y `Option2 Name`/`Option2 Value` (Color) leyendo el SKU.

2. **Variantes sin precio** (ej. en `100-linen-tablecloths` los dos colores `White`).
   Shopify rechazará la fila o pondrá precio 0. Hay que rellenar todos los precios.

3. **Variantes sin SKU** (mismo producto: `Palamós 180×300`, `White 180×300`, `White 250×250`).
   Sin SKU no se puede trackear inventario. Asignar SKUs únicos a todas.

### 🟠 Errores que importan, pero salen mal en la web

4. **Descripciones (`Body (HTML)`) con `\n` literal**
   Ejemplo (jersey LINESTONE):
   `<h2>100% recycled wool handmade Jersey.</h2>\n<h4>Cosy and comfortable…</h4>`
   En la web se verá literalmente `\n` como texto. Sustituir por saltos reales o por `<br>`.

5. **Pesos sospechosos** (`Variant Grams`)
   Hay manteles con peso `700` o `850` (gramos) y un jersey con `500`. Recordad: **el número siempre es gramos**, aunque la unidad ponga "kg". Si un mantel pesa 1,5 kg, hay que escribir `1500`. Verificar todos los pesos.

6. **`Variant Grams` con decimal** (`500.0`, `700.0`)
   Mejor escribir el entero (`500`, `700`).

7. **Imágenes vacías pero con `Image Position = 1.0`**
   Casi todas las filas tienen `Image Src` vacío y a la vez `Image Position` con valor `1.0`. Dos cosas mal: (a) sin URL la posición no sirve, (b) la posición debe ser entero (`1`, no `1.0`).
   **Recomendación:** o rellenas las URLs de imagen, o quitas las columnas de imagen del CSV y subes las imágenes a mano por producto en Shopify después de importar.

8. **Todos los `Image Alt Text` duplican el título**
   No es un error funcional, pero penaliza SEO. Personalizar al menos los productos top.

9. **SKU `TABLE180X300OW` asignado a color `Castell`**
   El sufijo `OW` ("off white") sugiere que ese SKU corresponde al color `White`, no a `Castell`. Probable intercambio de filas en la migración. Revisar producto por producto que el SKU coincide con el color/talla de la fila.

10. **Stock = 0 en todas las variantes con política `deny`**
    Si se importa así, **todo el catálogo aparece agotado**. Tres opciones:
    - Cargar el stock real en `Variant Inventory Qty`.
    - Cambiar `Variant Inventory Policy` a `continue` (permite vender sin stock — útil si vais a fabricar bajo demanda).
    - Dejar `Variant Inventory Tracker` vacío para no trackear inventario.

### 🟡 Recomendable rellenar antes de importar

11. **Columnas vacías en todo el CSV:** `Vendor`, `Type`, `Tags`, `Product Category`, `SEO Title`, `SEO Description`.
    Como mínimo conviene rellenar:
    - **Vendor:** `Mikmax`.
    - **Type:** categoría interna del producto (Jersey, Mantel, Pijama, etc.).
    - **Tags:** las colecciones automáticas se construyen por tags. Sin tags, hay que crear cada colección manual.

---

## 5. Ejemplo concreto — `100-linen-tablecloths` corregido

El producto **`100% Linen Tablecloths`** tiene 2 tallas (`180 x 300 cm`, `250 x 250 cm`) y 3 colores (`Castell`, `Palamós`, `White`) → 6 variantes.

### En el CSV (fila 1 lleva todos los datos del producto, las siguientes solo la variante)

| Handle | Title | Body (HTML) | Vendor | Type | Tags | Option1 Name | Option1 Value | Option2 Name | Option2 Value | Variant SKU | Variant Grams | Variant Price | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 100-linen-tablecloths | 100% Linen Tablecloths | `<h2>Mantel de lino</h2><p>Tejido a mano.</p>` | Mikmax | Mantel | mantel,lino,mesa | Talla | 180 x 300 cm | Color | Castell | TABLE180X300CA | 700 | 199.00 | active |
| 100-linen-tablecloths | | | | | | | 250 x 250 cm | | Castell | TABLE250X250CA | 850 | 189.00 | |
| 100-linen-tablecloths | | | | | | | 180 x 300 cm | | Palamós | TABLE180X300PA | 700 | 199.00 | |
| 100-linen-tablecloths | | | | | | | 250 x 250 cm | | Palamós | TABLE250X250PA | 850 | 189.00 | |
| 100-linen-tablecloths | | | | | | | 180 x 300 cm | | White | TABLE180X300WH | 700 | 199.00 | |
| 100-linen-tablecloths | | | | | | | 250 x 250 cm | | White | TABLE250X250WH | 850 | 189.00 | |

(He omitido en la tabla las columnas que no cambian para que se lea: peso, unidad, política de inventario, requires shipping, taxable, gift card, etc. se rellenan en cada fila como se explica en §2.)

### Después, en Sanity Studio

Abres el producto recién sincronizado y puedes rellenar los cuatro campos de texto (todos opcionales pero recomendados):

- **Descripción:** "Mantel de lino 100% natural tejido en telar tradicional. Cada pieza es única, con pequeñas irregularidades propias del oficio."
- **Propiedades del material:** "100% lino europeo. Gramaje 220 g/m². Tejido orgánico certificado OEKO-TEX."
- **Recomendaciones de lavado:** "Lavado a máquina a 30 °C en programa suave. No usar lejía. Plancha media. No secadora."
- **Uso recomendado:** "Mesas de hasta 8 comensales. Ideal para comidas familiares y eventos formales por su caída natural."

Y además:

- **Imágenes adicionales:** 2-3 fotos de la mesa montada (lifestyle), distintas de la foto-ficha del CSV. Por ejemplo una con variante *Hotspots* que tenga marcadores clicables sobre la cubertería que también vendéis.
- **Vídeo:** un timelapse de la mesa puesta para Navidad.
- **SEO editorial:** si queréis un título más comercial para Google, lo escribís aquí (si lo dejáis vacío, Google ve el `SEO Title` del CSV).

### Si este mantel formase parte de un Set "Mesa de Navidad"

Creáis en Sanity un nuevo **Set** con:
- Título: `Mesa de Navidad`.
- Imágenes editoriales: 2 fotos de la mesa completa.
- Componentes (mínimo 2): el mantel `Castell 250×250` + las servilletas + los bajoplatos (cada uno se elige de la lista de variantes ya sincronizadas desde Shopify).
- Color cerrado del set: `Castell`.
- Precio fijo: `289.00`.
- Estrategia de descuento: `Override: total cerrado` (para que Sanity ignore la suma de los componentes y aplique los 289 €).

---

## 6. Resumen — lo que hay que hacer

1. **Limpiar el CSV** según los puntos del apartado §4 (sobre todo los productos con `Default Title`, los precios/SKUs vacíos, los `\n` literales, los pesos y las imágenes).
2. **Subir las imágenes** a un servicio público (Shopify Files, Cloudinary, etc.) y pegar las URLs en `Image Src`. Alternativa más sencilla: importar sin imágenes y subirlas a mano por producto en Shopify Admin.
3. **Importar el CSV** en Shopify Admin → Products → Import. Marcar la opción "Replace any current products that have the same handle".
4. Esperar unos minutos a que la **sincronización con Sanity** copie los productos.
5. **Enriquecer en Sanity** los productos importantes con sus cuatro textos (descripción, propiedades del material, recomendaciones de lavado y uso recomendado), imágenes y vídeos.
6. Crear los **Looks y Sets** que queráis directamente en Sanity, eligiendo las variantes ya sincronizadas.
