import { headers } from "next/headers";
import { decodeThemePreview, resolveStoreTheme, storeThemeState, type ThemeSource } from "./resolve";
import type { ResolvedTheme } from "./types";
import { canUseTheme } from "@/lib/theme-access";

/** The theme to render for this request — the saved one, or a dashboard preview. */
export async function getRequestTheme(store: ThemeSource & { id?: string }): Promise<ResolvedTheme> {
  const h = await headers();
  const preview = decodeThemePreview(h.get("x-theme-preview"));
  // Previews may show any theme (that's how merchants try them); a saved
  // premium theme only renders while the plan includes premium themes.
  const premiumOk = preview || !store.id ? true : await canUseTheme(store.id, storeThemeState(store).themeId);
  return resolveStoreTheme(store, preview, { premiumOk });
}
