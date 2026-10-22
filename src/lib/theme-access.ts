// Who may use which theme: free themes for everyone, every premium theme
// on a plan with premium_themes, and individually bought themes forever.
import { query } from './db'
import { cacheDel, getOrSet } from './redis'
import { hasFeature } from './plan'
import { FREE_THEME_IDS } from './features-shared'

const ownedKey = (storeId: string) => `themes:owned:${storeId}`

/** Read on every storefront render of a premium theme, so cached (cleared on purchase). */
export async function ownedThemeIds(storeId: string): Promise<string[]> {
  return (
    (await getOrSet(
      ownedKey(storeId),
      async () => (await query<{ theme_id: string }>('SELECT theme_id FROM theme_purchases WHERE store_id = $1', [storeId])).map((r) => r.theme_id),
      600
    )) ?? []
  )
}

export async function ownsTheme(storeId: string, themeId: string): Promise<boolean> {
  return (await ownedThemeIds(storeId)).includes(themeId)
}

export async function clearOwnedThemes(storeId: string): Promise<void> {
  await cacheDel(ownedKey(storeId))
}

export async function canUseTheme(storeId: string, themeId: string): Promise<boolean> {
  if (FREE_THEME_IDS.has(themeId)) return true
  if (await hasFeature(storeId, 'premium_themes')) return true
  return ownsTheme(storeId, themeId)
}
