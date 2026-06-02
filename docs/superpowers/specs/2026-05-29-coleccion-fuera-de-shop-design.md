# Control de visibilidad de colecciones en el menú

Fecha: 2026-05-29
Estado: aprobado

## Problema

El submenú "Shop" se genera automáticamente y muestra **todas** las colecciones
de Sanity con productos en Shopify, agrupadas por jerarquía padre/hija. No hay
forma de excluir una colección concreta.

La colección de **Sets** debe salir del submenú de Shop y aparecer como item
propio de nivel superior, al lado de "Shop".

## Decisiones

- **Modelo: opt-out.** Por defecto todas las colecciones siguen apareciendo en
  Shop; se marca explícitamente las que se quieren ocultar. No rompe lo actual.
- **Sets al nivel superior: link manual.** Se añade en Settings → Menú un
  `linkInternal` apuntando a la colección de Sets. Ya soportado, sin código.

## Cambios de código (2 archivos)

### 1. `sanity/schemas/documents/collection.tsx`
Nuevo campo booleano:

- `name: 'hideFromShopMenu'`
- `title: 'Ocultar del menú Shop'`
- `type: 'boolean'`
- `initialValue: false`
- `description`: explica que la colección no aparecerá en el mega-menú de Shop
  (útil para colecciones como Sets que van como item propio en el nav).

Ubicación: junto al campo `parent` (zona de organización del menú).

### 2. `sanity/queries/common/settings.ts` → `fetchCollectionTree`
Añadir a las dos queries GROQ (padres e hijas) la condición:

```groq
&& coalesce(hideFromShopMenu, false) == false
```

## Comportamiento resultante

- Ocultar una colección **hija** → desaparece solo ella del submenú.
- Ocultar una colección **padre** → desaparece la columna entera (su "All" y sus
  hijas quedan huérfanas y no se renderizan, porque las hijas se adjuntan a
  padres presentes en el árbol).
- Al ser opt-out, nada cambia hasta marcar algo.

## Fuera de alcance

- Componentes del header (la URL `linkInternal → collection` ya enruta a
  `/shop/<handle>` vía `getInternalHref`).
- Revalidación: ya cubierta — publicar `collection` invalida el tag `settings`
  (`app/api/revalidate/route.ts`).
- Schema de `set` (bundles) y Shopify.

## Pasos editoriales (en Sanity Studio, no requieren código)

1. Marcar "Ocultar del menú Shop" en la colección de Sets.
2. En Settings → Menú, añadir un `linkInternal` titulado "Sets" → referencia a la
   colección de Sets, colocado al lado de "Shop".
