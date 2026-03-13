/**
 * Desk structure overrides
 */
import {type StructureResolver} from 'sanity/desk'
import collections from './collectionStructure'
import colorThemes from './colorThemeStructure'
import home from './homeStructure'
import pages from './pageStructure'
import products from './productStructure'
import settings from './settingStructure'
import posts from './postStructure'
import orderPosts from './orderPostStructure'
import orderProducts from './orderProductStructure'
import category from './categoryStructure'
import postTag from './postTagStructure'

/**
 * Desk structure overrides
 *
 * Sanity Studio automatically lists document types out of the box.
 * With this custom desk structure we achieve things like showing the `home`
 * and `settings` document types as singletons, and grouping product details
 * and variants for easy editorial access.
 *
 * You can customize this even further as your schemas progress.
 * To learn more about structure builder, visit our docs:
 * https://www.sanity.io/docs/overview-structure-builder
 */

// If you add document types to desk structure manually, you can add them to this function to prevent duplicates in the root pane
const hiddenDocTypes = (listItem: {getId?: () => string | undefined}) => {
  const id = listItem.getId?.()

  if (!id) {
    return false
  }

  return ![
    'collection',
    'colorTheme',
    'home',
    'media.tag',
    'page',
    'product',
    'productVariant',
    'settings',
    'post',
    'category',
    'postTag',
    'orderable.post',
    'orderable.product'
  ].includes(id)
}

export const structure: StructureResolver = (S, context) =>
  S.list()
    .title('Content')
    .items([
      home(S, context),
      pages(S, context),
      S.divider(),
      collections(S, context),
      products(S, context),
      orderProducts(S,context),
      S.divider(),
      posts(S, context),
      orderPosts(S, context),
      category(S, context),
      postTag(S, context),
      S.divider(),
      settings(S, context),
      S.divider(),
      ...S.documentTypeListItems().filter(hiddenDocTypes),
    ])
