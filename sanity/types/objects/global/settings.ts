// sanity/types/objects/global/settings.ts

import { SEO } from '../seo';
import type { Menu } from './menu';

export type SettingsData = {
  headerMenu: Menu;
  footerMenu: Menu;
  seo: SEO;
};