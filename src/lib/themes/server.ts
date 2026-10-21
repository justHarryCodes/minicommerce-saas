import { headers } from "next/headers";
import { decodeThemePreview, resolveStoreTheme, type ThemeSource } from "./resolve";
import type { ResolvedTheme } from "./types";

/** The theme to render for this request — the saved one, or a dashboard preview. */
export async function getRequestTheme(store: ThemeSource): Promise<ResolvedTheme> {
  const h = await headers();
  return resolveStoreTheme(store, decodeThemePreview(h.get("x-theme-preview")));
}
