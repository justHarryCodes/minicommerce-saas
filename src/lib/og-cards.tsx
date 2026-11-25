// Share cards: the image WhatsApp, Facebook, X, Telegram, TikTok and
// iMessage show when a product, store or blog link is pasted (og:image).
// 1200x630, drawn with next/og (Satori) and saved as JPEG: WhatsApp only
// shows previews for small images, and PNG cards are often over its limit.
//
// Product and store cards are light and brand-neutral: they represent the
// vendor's store, not Duka's dashboard theme. Blog cards are Duka's own.

import { readFile } from "fs/promises";
import { join } from "path";
import { ImageResponse } from "next/og";
import { cl } from "@/lib/cloudinary";

export const CARD = { width: 1200, height: 630 } as const;

const ACCENT = "#f59e0b";
const INK = "#18181b";
const MUTED = "#71717a";

let fontsP: Promise<{ name: string; data: Buffer; weight: 500 | 600 | 800; style: "normal" }[]> | null = null;
function fonts() {
  fontsP ??= (async () => {
    const dir = join(process.cwd(), "src", "fonts");
    const [medium, extraBold, noto] = await Promise.all([
      readFile(join(dir, "PlusJakartaSans-Medium.ttf")),
      readFile(join(dir, "PlusJakartaSans-ExtraBold.ttf")),
      readFile(join(dir, "NotoSans-SemiBold.ttf")), // fallback: ₦ and other symbols
    ]);
    return [
      { name: "Jakarta", data: medium, weight: 500 as const, style: "normal" as const },
      { name: "Jakarta", data: extraBold, weight: 800 as const, style: "normal" as const },
      { name: "Noto", data: noto, weight: 600 as const, style: "normal" as const },
    ];
  })().catch((e) => {
    fontsP = null;
    throw e;
  });
  return fontsP;
}

/** A photo Satori can draw (JPEG/PNG), cropped to size. Null if it can't be used. */
export function cardPhoto(url: string | null | undefined, w: number, h: number): string | null {
  if (!url) return null;
  if (url.includes("res.cloudinary.com")) {
    const [path, qs] = cl(url, `c_fill,g_auto,w_${w},h_${h},q_auto:good`).split("?");
    const cut = path.lastIndexOf("/") + 1;
    const file = path.slice(cut);
    const dot = file.lastIndexOf(".");
    const jpg = `${path.slice(0, cut)}${dot > 0 ? file.slice(0, dot) : file}.jpg`;
    return qs ? `${jpg}?${qs}` : jpg;
  }
  return /^https:\/\/.+\.(jpe?g|png)(\?|$)/i.test(url) ? url : null;
}

/**
 * Fetch an image's bytes. Node's fetch can hang trying IPv6 on some networks
 * (seen with Cloudinary), so after a short try it falls back to IPv4.
 */
async function download(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000), cache: "no-store" });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status < 500) return null;
  } catch {
    /* fall through to IPv4 */
  }
  const https = await import("https");
  return new Promise((resolve) => {
    const req = https.get(url, { family: 4, timeout: 8000 }, (res) => {
      if ((res.statusCode ?? 500) >= 400) {
        res.resume();
        return resolve(null);
      }
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (c: Buffer) => {
        size += c.length;
        if (size > 15 * 1024 * 1024) req.destroy(); // not a reasonable photo
        else chunks.push(c);
      });
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", () => resolve(null));
    });
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(null));
  });
}

/**
 * Download a photo, crop it and hand it to the card as a data URI. (Leaving
 * the download to Satori failed silently: blank cards.) Null if it can't be
 * loaded within a few seconds; the card then shows a placeholder.
 */
async function loadPhoto(url: string | null | undefined, w: number, h: number): Promise<string | null> {
  const src = cardPhoto(url, w, h) ?? (url && url.startsWith("https://") ? url : null);
  if (!src) return null;
  try {
    const bytes = await download(src);
    if (!bytes) return null;
    const sharp = (await import("sharp")).default;
    const jpg = await sharp(bytes).resize(w, h, { fit: "cover" }).jpeg({ quality: 85 }).toBuffer();
    return `data:image/jpeg;base64,${jpg.toString("base64")}`;
  } catch {
    return null;
  }
}

const clip = (s: string | null | undefined, n: number) => {
  const t = (s ?? "").replace(/<[^>]*>/g, " ").replace(/[#*_`>~]/g, "").replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, n - 1).replace(/[\s,.;:–-]+\S*$/, "")}…`;
};
const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;
const host = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

async function render(node: React.ReactElement): Promise<Buffer> {
  const img = new ImageResponse(node, { ...CARD, fonts: await fonts() });
  const png = Buffer.from(await img.arrayBuffer());
  const sharp = (await import("sharp")).default;
  return sharp(png).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
}

/* ──────────────────────── Brand-coloured photo cards ──────────────────────── */
// Layout (like a WhatsApp / iMessage preview): the photo fills the card and is
// shown whole on a blurred, brand-tinted copy of itself; a pill in the store's
// brand colour carries its logo and name. WhatsApp writes the title,
// description and link under the image itself, so the card doesn't repeat them.

type Rgb = [number, number, number];

function hexRgb(hex: string): Rgb {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0").slice(0, 6);
  const n = parseInt(full, 16);
  return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [245, 158, 11];
}

/** Black or white, whichever reads better on the brand colour. */
export function inkOn(hex: string): string {
  const lum = hexRgb(hex)
    .map((v) => v / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const L = 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
  return (L + 0.05) / 0.05 > 1.05 / (L + 0.05) ? "#000000" : "#ffffff";
}

/** The photo whole (fitted) plus a blurred, brand-tinted cover of it for the background. */
async function photoLayers(url: string | null | undefined, accent: string, w: number, h: number): Promise<{ fg: string; bg: string; fw: number; fh: number } | null> {
  const src = url?.includes("res.cloudinary.com")
    ? cardPhoto(url, 1200, 1200)?.replace(/c_fill,g_auto,w_1200,h_1200/, "c_limit,w_1200,h_1200") ?? null
    : url && /^https:\/\//.test(url) ? url : null;
  if (!src) return null;
  try {
    const bytes = await download(src);
    if (!bytes) return null;
    const sharp = (await import("sharp")).default;
    const fgBuf = await sharp(bytes).resize(w, h, { fit: "inside" }).jpeg({ quality: 86 }).toBuffer({ resolveWithObject: true });
    const [r, g, b] = hexRgb(accent);
    // Blur small (fast), then scale up and tint with the brand colour (one resize per sharp pipeline)
    const small = await sharp(bytes).resize(Math.round(w / 8), Math.round(h / 8), { fit: "cover" }).blur(3).toBuffer();
    const bgBuf = await sharp(small)
      .resize(w, h, { kernel: "cubic" })
      .composite([{ input: { create: { width: w, height: h, channels: 4, background: { r, g, b, alpha: 0.38 } } }, blend: "over" }])
      .jpeg({ quality: 72 })
      .toBuffer();
    return {
      fg: `data:image/jpeg;base64,${fgBuf.data.toString("base64")}`,
      bg: `data:image/jpeg;base64,${bgBuf.toString("base64")}`,
      fw: fgBuf.info.width,
      fh: fgBuf.info.height,
    };
  } catch {
    return null;
  }
}

function BrandPill({ name, logo, accent, sub }: { name: string; logo: string | null; accent: string; sub?: string }) {
  const ink = inkOn(accent);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, background: accent, color: ink, padding: logo ? "10px 26px 10px 10px" : "14px 28px", borderRadius: 999, boxShadow: "0 6px 24px rgba(0,0,0,0.18)" }}>
      {logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} width={52} height={52} style={{ width: 52, height: 52, borderRadius: 52, objectFit: "cover", background: "#fff" }} alt="" />
      )}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 800, lineHeight: 1.1 }}>{clip(name, 28)}</div>
        {sub && <div style={{ display: "flex", fontSize: 20, fontWeight: 500, opacity: 0.8 }}>{sub}</div>}
      </div>
    </div>
  );
}

function Backdrop({ layers, accent, label }: { layers: { fg: string; bg: string; fw: number; fh: number } | null; accent: string; label: string }) {
  const [r, g, b] = hexRgb(accent);
  if (!layers) {
    return (
      <div style={{ position: "absolute", top: 0, left: 0, width: CARD.width, height: CARD.height, display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, rgba(${r},${g},${b},0.18), rgba(${r},${g},${b},0.45))`, color: INK, fontSize: 56, fontWeight: 800, padding: 80, textAlign: "center" }}>
        {clip(label, 40)}
      </div>
    );
  }
  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: CARD.width, height: CARD.height, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={layers.bg} width={CARD.width} height={CARD.height} style={{ position: "absolute", top: 0, left: 0, width: CARD.width, height: CARD.height }} alt="" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={layers.fg} width={layers.fw} height={layers.fh} style={{ width: layers.fw, height: layers.fh, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }} alt="" />
    </div>
  );
}

/* ─────────────────────────────── Product ─────────────────────────────── */

export interface ProductCardData {
  name: string;
  price: number;
  compare: number | null;
  description: string | null;
  image: string | null;
  storeName: string;
  storeLogo: string | null;
  storeUrl: string;
  inStock: boolean;
  /** The store's brand colour (its theme accent) */
  accent?: string | null;
}

export async function productCard(d: ProductCardData): Promise<Buffer> {
  const accent = /^#[0-9a-f]{3,8}$/i.test(d.accent ?? "") ? d.accent! : ACCENT;
  const [layers, logo] = await Promise.all([photoLayers(d.image, accent, CARD.width, CARD.height), loadPhoto(d.storeLogo, 104, 104)]);
  const off = d.compare && d.compare > d.price ? Math.round((1 - d.price / d.compare) * 100) : 0;
  return render(
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#f4f4f5", fontFamily: "Jakarta, Noto" }}>
      <Backdrop layers={layers} accent={accent} label={d.name} />

      {off > 0 && (
        <div style={{ position: "absolute", top: 32, left: 32, display: "flex", background: accent, color: inkOn(accent), fontSize: 30, fontWeight: 800, padding: "8px 20px", borderRadius: 999, boxShadow: "0 6px 20px rgba(0,0,0,0.18)" }}>
          -{off}%
        </div>
      )}
      {!d.inStock && (
        <div style={{ position: "absolute", top: 32, right: 32, display: "flex", background: "#18181b", color: "#fff", fontSize: 26, fontWeight: 800, padding: "8px 20px", borderRadius: 999 }}>Sold out</div>
      )}

      {/* Store (brand colour) + price */}
      <div style={{ position: "absolute", left: 32, right: 32, bottom: 32, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20 }}>
        <BrandPill name={d.storeName} logo={logo} accent={accent} sub={clip(host(d.storeUrl), 46)} />
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, background: "#ffffff", color: INK, padding: "12px 26px", borderRadius: 999, boxShadow: "0 6px 24px rgba(0,0,0,0.18)" }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800 }}>{naira(d.price)}</div>
          {off > 0 && <div style={{ display: "flex", fontSize: 24, fontWeight: 500, color: MUTED, textDecoration: "line-through" }}>{naira(d.compare!)}</div>}
        </div>
      </div>
    </div>,
  );
}

/* ──────────────────────────────── Store ──────────────────────────────── */

export interface StoreCardData {
  name: string;
  logo: string | null;
  description: string | null;
  url: string;
  productCount: number;
  photos: string[];
  accent?: string | null;
}

export async function storeCard(d: StoreCardData): Promise<Buffer> {
  const accent = /^#[0-9a-f]{3,8}$/i.test(d.accent ?? "") ? d.accent! : ACCENT;
  // Up to 3 product photos side by side, each shown whole on a brand tint
  const [logo, ...tiles] = await Promise.all([loadPhoto(d.logo, 104, 104), ...d.photos.slice(0, 3).map((p) => loadPhoto(p, 400, 630))]);
  const shown = tiles.filter((t): t is string => !!t);
  const [r, g, b] = hexRgb(accent);
  const w = shown.length ? Math.floor(CARD.width / shown.length) : CARD.width;
  return render(
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: `rgb(${r},${g},${b})`, fontFamily: "Jakarta, Noto" }}>
      {shown.length ? (
        <div style={{ position: "absolute", top: 0, left: 0, width: CARD.width, height: CARD.height, display: "flex", gap: 6 }}>
          {shown.map((t) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={t} src={t} width={w} height={CARD.height} style={{ width: w, height: CARD.height, objectFit: "cover" }} alt="" />
          ))}
        </div>
      ) : (
        <Backdrop layers={null} accent={accent} label={d.name} />
      )}
      {/* Soft fade at the bottom so the pill always reads */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 260, display: "flex", background: "linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0))" }} />
      <div style={{ position: "absolute", left: 32, right: 32, bottom: 32, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20 }}>
        <BrandPill name={d.name} logo={logo} accent={accent} sub={clip(host(d.url), 46)} />
        {d.productCount > 0 && (
          <div style={{ display: "flex", background: "#ffffff", color: INK, fontSize: 26, fontWeight: 800, padding: "14px 26px", borderRadius: 999, boxShadow: "0 6px 24px rgba(0,0,0,0.18)" }}>
            {d.productCount} product{d.productCount === 1 ? "" : "s"} · Shop now
          </div>
        )}
      </div>
    </div>,
  );
}

/* ──────────────────────────────── Blog ───────────────────────────────── */
// Duka's own card (not a vendor's), so it carries Duka's brand: a dark
// editorial panel with the logo, category, headline and byline, and the
// article's cover photo on the right.

let markP: Promise<string | null> | null = null;
function dukaMark(): Promise<string | null> {
  markP ??= readFile(join(process.cwd(), "public", "logo-mark.png"))
    .then((b) => `data:image/png;base64,${b.toString("base64")}`)
    .catch(() => null);
  return markP;
}

export interface BlogCardData {
  title: string;
  category: string;
  cover: string | null;
  author: string;
  minutes: number;
}

export async function blogCard(d: BlogCardData): Promise<Buffer> {
  const PHOTO_W = 520;
  const [cover, mark] = await Promise.all([loadPhoto(d.cover, PHOTO_W, CARD.height), dukaMark()]);
  const textW = cover ? CARD.width - PHOTO_W : CARD.width;
  const title = clip(d.title, cover ? 92 : 120);
  const size = title.length > 70 ? 50 : title.length > 46 ? 58 : 66;
  return render(
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#0b0b0c", fontFamily: "Jakarta, Noto" }}>
      {/* Warm glow behind the text */}
      <div style={{ position: "absolute", top: 0, left: 0, width: CARD.width, height: CARD.height, display: "flex", background: "linear-gradient(135deg, rgba(245,158,11,0.30) 0%, rgba(245,158,11,0.08) 30%, rgba(11,11,12,0) 55%)" }} />

      {cover && (
        <div style={{ position: "absolute", top: 0, right: 0, width: PHOTO_W, height: CARD.height, display: "flex" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} width={PHOTO_W} height={CARD.height} style={{ width: PHOTO_W, height: CARD.height, objectFit: "cover" }} alt="" />
          {/* Fade the photo into the panel */}
          <div style={{ position: "absolute", top: 0, left: 0, width: 160, height: CARD.height, display: "flex", background: "linear-gradient(to right, #0b0b0c, rgba(11,11,12,0))" }} />
        </div>
      )}

      <div style={{ position: "relative", width: textW, height: CARD.height, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 56px 52px 64px" }}>
        {/* Duka Blog */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {mark && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mark} width={30} height={47} style={{ width: 30, height: 47 }} alt="" />
          )}
          <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: "#ffffff", letterSpacing: 1 }}>DUKA</div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 500, color: "rgba(255,255,255,0.55)" }}>Blog</div>
          {!cover && <div style={{ display: "flex", marginLeft: "auto", fontSize: 24, fontWeight: 500, color: "#fbbf24" }}>dukanigeria.com/blog</div>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex" }}>
            <div style={{ display: "flex", background: ACCENT, color: "#000000", fontSize: 22, fontWeight: 800, padding: "8px 18px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 1 }}>{clip(d.category, 24)}</div>
          </div>
          <div style={{ display: "flex", fontSize: size, fontWeight: 800, lineHeight: 1.08, color: "#ffffff", letterSpacing: -1.5 }}>{title}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, fontWeight: 500, color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap" }}>
          <div style={{ display: "flex", width: 40, height: 40, borderRadius: 40, background: ACCENT, color: "#000", fontSize: 20, fontWeight: 800, alignItems: "center", justifyContent: "center" }}>
            {(d.author.trim()[0] ?? "D").toUpperCase()}
          </div>
          <div style={{ display: "flex" }}>{clip(d.author, 28)}</div>
          <div style={{ display: "flex", opacity: 0.5 }}>·</div>
          <div style={{ display: "flex" }}>{Math.max(1, d.minutes)} min read</div>
        </div>
      </div>
    </div>,
  );
}

export const CARD_HEADERS = {
  "Content-Type": "image/jpeg",
  // URLs carry a version (?v=...), so a changed product gets a new card URL
  "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
};
