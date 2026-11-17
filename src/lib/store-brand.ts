// A store's brand colour: the accent of the theme its storefront shows.
import { resolveStoreTheme, storeThemeState, type ThemeSource } from "@/lib/themes/resolve";
import { canUseTheme } from "@/lib/theme-access";

export async function storeAccent(store: ThemeSource & { id: string }): Promise<string> {
  try {
    const premiumOk = await canUseTheme(store.id, storeThemeState(store).themeId).catch(() => true);
    return resolveStoreTheme(store, null, { premiumOk }).tokens.accent;
  } catch {
    return "#f59e0b";
  }
}
