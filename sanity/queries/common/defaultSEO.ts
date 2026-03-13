import { getSettings } from './settings';

export async function getDefaultSEO() {
  const settings = await getSettings()
  return settings.seo
}

