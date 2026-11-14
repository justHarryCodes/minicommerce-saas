// Minimal Meta Graph API client. Never throws: returns { ok, data | error }.

import { GRAPH_VERSION } from "./config";

export type GraphResult<T = Record<string, unknown>> = { ok: true; data: T } | { ok: false; error: string; code?: number };

export async function graph<T = Record<string, unknown>>(
  path: string,
  opts: { token?: string; method?: "GET" | "POST" | "DELETE"; body?: unknown; query?: Record<string, string> } = {},
): Promise<GraphResult<T>> {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION()}/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v);
  try {
    const res = await fetch(url, {
      method: opts.method ?? (opts.body ? "POST" : "GET"),
      headers: {
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || data.error) {
      const err = (data.error ?? {}) as { message?: string; code?: number; error_user_msg?: string };
      return { ok: false, error: err.error_user_msg || err.message || `Meta returned ${res.status}`, code: err.code };
    }
    return { ok: true, data: data as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't reach Meta" };
  }
}
