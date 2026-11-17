// Plain helpers for Signature theme homepages (safe on server and client).
import type { Product } from "@/types";

export const imageOf = (p?: Product) => (p ? (p.images?.[0] ?? p.image_url ?? null) : null);

export const hms = (left: number | null) =>
  left === null ? ["--", "--", "--"] : [Math.floor(left / 3600), Math.floor((left % 3600) / 60), left % 60].map((n) => String(n).padStart(2, "0"));
