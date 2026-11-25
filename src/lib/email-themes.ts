// Looks for marketing messages: each template has one (an emoji badge, a
// colour and, for some, a photo) and the admin can switch it in the builder.
// The same theme colours the custom elements in the message (steps, icon
// rows, tips, tiles), so every template reads as one designed piece.
// Browser-safe.

import { emailImage, type ElementColors } from "./email-elements";

export interface EmailTheme {
  id: string;
  label: string;
  /** Big badge at the top of the message */
  emoji: string;
  /** Small label above the headline ("WELCOME", "NEW FEATURE"…) */
  kicker: string;
  accent: string;
  onAccent: string;
  tint: string;
  link: string;
  /** Hero photo (Cloudinary), optional */
  image?: string;
}

const PHOTO = "https://res.cloudinary.com/wnlu84s5/image/upload";
export const THEME_PHOTOS = {
  phones: `${PHOTO}/v1795513112/duka-blog/cover-phones.jpg`,
  chat: `${PHOTO}/v1795513113/duka-blog/whatsapp-texting.jpg`,
  market: `${PHOTO}/v1795513114/duka-blog/cover-idumota-market.jpg`,
  fashion: `${PHOTO}/v1795513115/duka-blog/cover-fashion-workshop.jpg`,
  shoes: `${PHOTO}/v1795513116/duka-blog/shoe-seller-kaduna.jpg`,
  street: `${PHOTO}/v1795513117/duka-blog/cover-computer-village.jpg`,
  trader: `${PHOTO}/v1795513118/duka-blog/mile12-trader.jpg`,
  payment: `${PHOTO}/v1795513111/duka-blog/cover-card-payment.jpg`,
};

const t = (id: string, label: string, emoji: string, kicker: string, accent: string, tint: string, link: string, image?: string, onAccent = "#ffffff"): EmailTheme => ({
  id, label, emoji, kicker, accent, onAccent, tint, link, ...(image ? { image } : {}),
});

export const EMAIL_THEMES: EmailTheme[] = [
  t("celebrate", "Celebrate", "🎉", "Welcome", "#f59e0b", "#fffbeb", "#b45309", THEME_PHOTOS.phones, "#000000"),
  t("shop", "Shop", "🛍️", "Get started", "#0ea5e9", "#f0f9ff", "#0369a1", THEME_PHOTOS.fashion),
  t("money", "Money", "💸", "Get paid", "#10b981", "#ecfdf5", "#047857", THEME_PHOTOS.payment),
  t("brand", "Brand", "🎨", "Look the part", "#8b5cf6", "#f5f3ff", "#6d28d9", THEME_PHOTOS.fashion),
  t("share", "Share", "📣", "Spread the word", "#f97316", "#fff7ed", "#c2410c", THEME_PHOTOS.chat),
  t("whatsapp", "WhatsApp", "💬", "New feature", "#25d366", "#f0fdf4", "#15803d", THEME_PHOTOS.chat, "#052e16"),
  t("search", "Search", "🔍", "Get found", "#3b82f6", "#eff6ff", "#1d4ed8", THEME_PHOTOS.street),
  t("boost", "Boost", "⚡", "Quick wins", "#eab308", "#fefce8", "#a16207", THEME_PHOTOS.market, "#000000"),
  t("festive", "Festive", "🎄", "Season's sales", "#dc2626", "#fef2f2", "#b91c1c", THEME_PHOTOS.market),
  t("pro", "Pro", "🚀", "Go Pro", "#18181b", "#f4f4f5", "#b45309", THEME_PHOTOS.trader),
  t("space", "Space", "📦", "Room to grow", "#6366f1", "#eef2ff", "#4338ca"),
  t("domain", "Domain", "🌐", "Own your address", "#0891b2", "#ecfeff", "#0e7490"),
  t("trophy", "Trophy", "🏆", "Top seller", "#ca8a04", "#fefce8", "#a16207", THEME_PHOTOS.trader, "#000000"),
  t("renew", "Renew", "🔁", "Welcome back", "#e11d48", "#fff1f2", "#be123c"),
  // Mostly for vendor broadcasts (store -> shoppers)
  t("new", "New arrivals", "✨", "Just landed", "#8b5cf6", "#f5f3ff", "#6d28d9"),
  t("sale", "Sale", "🔥", "Sale on", "#ef4444", "#fef2f2", "#b91c1c"),
  t("restock", "Back in stock", "📦", "Back in stock", "#10b981", "#ecfdf5", "#047857"),
  t("thanks", "Thank you", "💛", "From us to you", "#f59e0b", "#fffbeb", "#b45309", undefined, "#000000"),
  t("plain", "Simple", "✉️", "", "#f59e0b", "#fafafa", "#b45309", undefined, "#000000"),
];

export const themeById = (id: string | null | undefined): EmailTheme => EMAIL_THEMES.find((x) => x.id === id) ?? EMAIL_THEMES[EMAIL_THEMES.length - 1];

export const themeColors = (th: EmailTheme): ElementColors => ({ accent: th.accent, onAccent: th.onAccent, tint: th.tint, link: th.link });

/** A vendor's broadcast takes their store colour, keeping the theme's emoji and label. */
export function withAccent(th: EmailTheme, accent: string, onAccent?: string): EmailTheme {
  if (!/^#[0-9a-f]{6}$/i.test(accent)) return th;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(accent.slice(i, i + 2), 16));
  if (!onAccent) {
    // Black or white text, whichever reads better on the colour
    const lum = [r, g, b].map((v) => v / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    const L = 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
    onAccent = (L + 0.05) / 0.05 > 1.05 / (L + 0.05) ? "#000000" : "#ffffff";
  }
  const mix = (v: number) => Math.round(v + (255 - v) * 0.92).toString(16).padStart(2, "0");
  const dark = (v: number) => Math.round(v * 0.62).toString(16).padStart(2, "0");
  return { ...th, accent, onAccent, tint: `#${mix(r)}${mix(g)}${mix(b)}`, link: `#${dark(r)}${dark(g)}${dark(b)}` };
}

/* ─────────────────────────────── Hero element ─────────────────────────────── */

const escAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The top of a themed email: the photo (if the theme has one), then the
 * emoji badge with the theme's label. Email-safe (tables, inline styles).
 */
export function heroHtml(th: EmailTheme, opts: { showImage?: boolean; kicker?: string } = {}): string {
  const kicker = opts.kicker ?? th.kicker;
  const img =
    opts.showImage !== false && th.image
      ? `<img src="${escAttr(emailImage(th.image, 1008, 420))}" width="504" alt="" style="display:block;width:100%;max-width:504px;height:auto;border-radius:16px;border:0;margin:0 0 18px">`
      : "";
  return `${img}<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px"><tr>
<td width="48" valign="middle"><div style="width:44px;height:44px;line-height:44px;border-radius:14px;background:${th.tint};border:1px solid ${th.accent}33;text-align:center;font-size:24px">${escAttr(th.emoji)}</div></td>
${kicker ? `<td valign="middle" style="padding-left:10px;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${th.link}">${escAttr(kicker)}</td>` : ""}
</tr></table>`;
}

/** The main button, in the theme colour. */
export function buttonHtml(th: EmailTheme, href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 0"><tr><td style="border-radius:12px;background:${th.accent}">
<a href="${escAttr(href)}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:800;color:${th.onAccent};text-decoration:none;border-radius:12px">${escAttr(label)} &rarr;</a>
</td></tr></table>`;
}
