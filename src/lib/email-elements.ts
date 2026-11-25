// Custom elements for marketing messages (Admin -> Campaigns and the vendor
// Growth -> Broadcasts). The message stays plain, editable text; a few simple
// line markers turn into designed elements:
//
//   1. Add products            -> numbered step cards
//   • 💬 Share on WhatsApp      -> icon rows (an emoji at the start becomes the icon;
//   - Restock best sellers        without one the row gets a tick)
//   > 💡 Tip: post at 8pm       -> a highlighted tip box (emoji optional)
//   [[🚀 Own domain | yourbrand.com]]  -> feature tiles (several in a row make a grid)
//   ![Alt text](https://…)      -> a full-width picture (Duka / Cloudinary images only)
//   ---                         -> a divider
//   **bold**, https://links     -> inline
//
// Browser-safe (no server imports): the builders' live previews use the same
// parser as the emails, so what admins and vendors see is what gets sent.

export type Block =
  | { kind: "para"; text: string }
  | { kind: "steps"; items: string[] }
  | { kind: "list"; items: { icon: string | null; text: string }[] }
  | { kind: "tip"; icon: string | null; text: string }
  | { kind: "tiles"; items: { icon: string; title: string; text: string }[] }
  | { kind: "image"; alt: string; url: string }
  | { kind: "divider" };

// A leading emoji (with optional variation selector / ZWJ sequence / skin tone)
const EMOJI_START = /^((?:\p{Extended_Pictographic}|\p{Regional_Indicator}{2})(?:️|‍(?:\p{Extended_Pictographic})|\p{Emoji_Modifier})*)\s*/u;

/** Picture links we allow in messages: Duka's own image host and site. */
export function allowedImage(url: string): boolean {
  return /^https:\/\/(res\.cloudinary\.com|(www\.)?dukanigeria\.com)\//i.test(url.trim());
}

function splitEmoji(s: string): { icon: string | null; text: string } {
  const m = s.match(EMOJI_START);
  return m ? { icon: m[1], text: s.slice(m[0].length) } : { icon: null, text: s };
}

const STEP = /^\s*(\d{1,2})[.)]\s+(.+)$/;
const BULLET = /^\s*[•\-*]\s+(.+)$/;
const TIP = /^\s*>\s?(.*)$/;
const TILE = /^\s*\[\[(.+?)\]\]\s*$/;
const IMAGE = /^\s*!\[([^\]]*)\]\((https:\/\/[^)\s]+)\)\s*$/;
const DIVIDER = /^\s*(-{3,}|_{3,}|\*{3,})\s*$/;

/** Text -> blocks. Lines of the same kind next to each other join one element. */
export function parseBlocks(text: string): Block[] {
  const out: Block[] = [];
  const lines = (text ?? "").replace(/\r\n?/g, "\n").split("\n");
  let para: string[] = [];
  const flush = () => {
    const t = para.join("\n").trim();
    if (t) out.push({ kind: "para", text: t });
    para = [];
  };
  const last = () => out[out.length - 1];

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    let m: RegExpMatchArray | null;
    if (DIVIDER.test(line)) {
      flush();
      out.push({ kind: "divider" });
    } else if ((m = line.match(IMAGE))) {
      flush();
      if (allowedImage(m[2])) out.push({ kind: "image", alt: m[1].trim(), url: m[2].trim() });
    } else if ((m = line.match(TILE))) {
      flush();
      const [head, ...rest] = m[1].split("|");
      const { icon, text: title } = splitEmoji(head.trim());
      const item = { icon: icon ?? "✨", title: title.trim(), text: rest.join("|").trim() };
      const prev = last();
      if (prev?.kind === "tiles" && prev.items.length < 4) prev.items.push(item);
      else out.push({ kind: "tiles", items: [item] });
    } else if ((m = line.match(STEP))) {
      flush();
      const prev = last();
      if (prev?.kind === "steps") prev.items.push(m[2].trim());
      else out.push({ kind: "steps", items: [m[2].trim()] });
    } else if ((m = line.match(BULLET)) && !/^\*\*/.test(line.trim())) {
      flush();
      const item = splitEmoji(m[1].trim());
      const prev = last();
      if (prev?.kind === "list") prev.items.push(item);
      else out.push({ kind: "list", items: [item] });
    } else if ((m = line.match(TIP))) {
      flush();
      const prev = last();
      if (prev?.kind === "tip") prev.text += `\n${m[1]}`;
      else {
        const t = splitEmoji(m[1].trim());
        out.push({ kind: "tip", icon: t.icon, text: t.text });
      }
    } else {
      para.push(line);
    }
  }
  flush();
  return out;
}

/** The message as plain text (push notifications, WhatsApp, previews in lists). */
export function plainText(text: string): string {
  return parseBlocks(text)
    .map((b) => {
      switch (b.kind) {
        case "para":
          return b.text;
        case "steps":
          return b.items.map((s, i) => `${i + 1}. ${s}`).join("\n");
        case "list":
          return b.items.map((it) => `${it.icon ?? "•"} ${it.text}`).join("\n");
        case "tip":
          return `${b.icon ? `${b.icon} ` : ""}${b.text}`;
        case "tiles":
          return b.items.map((t) => `${t.icon} ${t.title}${t.text ? `: ${t.text}` : ""}`).join("\n");
        case "image":
        case "divider":
          return "";
      }
    })
    .filter(Boolean)
    .join("\n\n")
    .replace(/\*\*(.+?)\*\*/g, "$1");
}

/* ─────────────────────────────── Email HTML ─────────────────────────────── */

const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Escaped text with **bold**, links and line breaks. */
export function inlineHtml(s: string, linkColor: string): string {
  return escHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#18181b">$1</strong>')
    .replace(/(https:\/\/[^\s<]+)/g, `<a href="$1" style="color:${linkColor};font-weight:600">$1</a>`)
    .replace(/\n/g, "<br>");
}

export interface ElementColors {
  /** Strong brand colour (numbers, icons, borders) */
  accent: string;
  /** Text on the accent colour */
  onAccent: string;
  /** Pale tint of the accent (backgrounds) */
  tint: string;
  /** Readable accent for links on white */
  link: string;
}

/** Email-safe HTML (tables + inline styles: works in Gmail, Outlook, Apple Mail). */
export function blocksHtml(blocks: Block[], c: ElementColors, opts: { fontSize?: number } = {}): string {
  const fs = opts.fontSize ?? 15;
  const p = (inner: string, extra = "") => `<p style="margin:0 0 14px;font-size:${fs}px;line-height:1.6;color:#3f3f46;${extra}">${inner}</p>`;
  return blocks
    .map((b) => {
      switch (b.kind) {
        case "para":
          return p(inlineHtml(b.text, c.link));
        case "steps":
          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 16px">${b.items
            .map(
              (s, i) => `<tr><td style="padding:0 0 8px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.tint};border-radius:14px"><tr>
<td width="44" valign="top" style="padding:12px 0 12px 12px"><div style="width:30px;height:30px;line-height:30px;border-radius:15px;background:${c.accent};color:${c.onAccent};text-align:center;font-weight:800;font-size:14px">${i + 1}</div></td>
<td valign="middle" style="padding:12px 14px 12px 8px;font-size:${fs - 1}px;line-height:1.5;color:#27272a">${inlineHtml(s, c.link)}</td>
</tr></table></td></tr>`,
            )
            .join("")}</table>`;
        case "list":
          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px">${b.items
            .map(
              (it) => `<tr>
<td width="40" valign="top" style="padding:0 0 10px"><div style="width:30px;height:30px;line-height:30px;border-radius:9px;background:${it.icon ? c.tint : c.accent};color:${c.onAccent};text-align:center;font-size:${it.icon ? 16 : 14}px;font-weight:800">${it.icon ? escHtml(it.icon) : "✓"}</div></td>
<td valign="middle" style="padding:4px 0 10px 4px;font-size:${fs - 1}px;line-height:1.5;color:#3f3f46">${inlineHtml(it.text, c.link)}</td>
</tr>`,
            )
            .join("")}</table>`;
        case "tip":
          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 16px"><tr>
<td style="background:${c.tint};border-left:4px solid ${c.accent};border-radius:12px;padding:14px 16px;font-size:${fs - 1}px;line-height:1.55;color:#27272a">
${b.icon ? `<span style="font-size:18px;margin-right:6px">${escHtml(b.icon)}</span>` : ""}${inlineHtml(b.text, c.link)}
</td></tr></table>`;
        case "tiles": {
          const w = Math.floor(100 / b.items.length);
          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 14px"><tr>${b.items
            .map(
              (t) => `<td width="${w}%" valign="top" style="padding:0 4px 8px">
<div style="background:${c.tint};border-radius:14px;padding:14px 10px;text-align:center">
<div style="font-size:26px;line-height:1">${escHtml(t.icon)}</div>
<div style="margin-top:8px;font-size:13px;font-weight:800;color:#18181b;line-height:1.3">${inlineHtml(t.title, c.link)}</div>
${t.text ? `<div style="margin-top:3px;font-size:12px;color:#52525b;line-height:1.4">${inlineHtml(t.text, c.link)}</div>` : ""}
</div></td>`,
            )
            .join("")}</tr></table>`;
        }
        case "image":
          return `<p style="margin:4px 0 16px"><img src="${escHtml(emailImage(b.url))}" width="504" alt="${escHtml(b.alt)}" style="display:block;width:100%;max-width:504px;height:auto;border-radius:14px;border:0"></p>`;
        case "divider":
          return `<div style="margin:6px 0 18px;border-top:1px solid #e4e4e7;font-size:0;line-height:0">&nbsp;</div>`;
      }
    })
    .join("\n");
}

/** A Cloudinary picture sized and compressed for email (JPEG: every client reads it). */
export function emailImage(url: string, w = 1008, h?: number): string {
  if (!/res\.cloudinary\.com\/.+\/image\/upload\//.test(url)) return url;
  const t = h ? `c_fill,g_auto,w_${w},h_${h},q_auto:good,f_jpg` : `c_limit,w_${w},q_auto:good,f_jpg`;
  return url.replace(/\/image\/upload\/(v\d+\/)?/, (_m, v: string | undefined) => `/image/upload/${t}/${v ?? ""}`);
}

/** Snippets for the builders' "Add element" buttons. */
export const ELEMENT_SNIPPETS: { id: string; label: string; emoji: string; text: string }[] = [
  { id: "steps", label: "Steps", emoji: "🔢", text: "1. First thing to do\n2. Second thing\n3. Third thing" },
  { id: "list", label: "Icon list", emoji: "✅", text: "• 💬 Something good\n• 🚚 Another good thing\n• 💳 One more" },
  { id: "tip", label: "Tip box", emoji: "💡", text: "> 💡 Tip: a short, helpful tip" },
  { id: "tiles", label: "Feature tiles", emoji: "🧩", text: "[[🚀 Faster | short line]]\n[[🛡️ Safer | short line]]\n[[📈 Bigger | short line]]" },
  { id: "image", label: "Picture", emoji: "🖼️", text: "![Describe the picture](https://res.cloudinary.com/…)" },
  { id: "divider", label: "Divider", emoji: "➖", text: "---" },
];
