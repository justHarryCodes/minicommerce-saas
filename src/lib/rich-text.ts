// A tiny, safe subset of Markdown for store pages and blog posts.
// Merchants write plain text; we parse it into a block tree that React
// renders — no HTML string is ever produced, so there is nothing to inject.
//
//   # Heading / ## Subheading / ### Small heading
//   - bullet or * bullet          1. numbered
//   > quote
//   **bold**, *italic*, [link text](https://…)
//   blank line = new paragraph; --- = divider

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'bold'; c: Inline[] }
  | { t: 'italic'; c: Inline[] }
  | { t: 'link'; href: string; c: Inline[] }

export type Block =
  | { t: 'h'; level: 2 | 3 | 4; c: Inline[] }
  | { t: 'p'; c: Inline[][] } // lines inside one paragraph
  | { t: 'ul'; items: Inline[][] }
  | { t: 'ol'; items: Inline[][] }
  | { t: 'quote'; c: Inline[][] }
  | { t: 'hr' }

/** Only web, mail, phone, WhatsApp and same-site links survive. */
export function safeHref(raw: string): string | null {
  const href = raw.trim()
  if (/^(https?:\/\/|mailto:|tel:)/i.test(href)) return href
  if (/^\/(?!\/)/.test(href)) return href // same-site path, not protocol-relative
  if (/^#[\w-]*$/.test(href)) return href
  return null
}

/** Index of the ")" closing the "(" at `open`, allowing nested pairs (e.g. Wikipedia URLs). */
function matchingParen(src: string, open: number): number {
  let depth = 0
  for (let j = open; j < src.length; j++) {
    if (src[j] === '(') depth++
    else if (src[j] === ')' && --depth === 0) return j
  }
  return -1
}

export function parseInline(src: string): Inline[] {
  const out: Inline[] = []
  let text = ''
  const flush = () => {
    if (text) out.push({ t: 'text', v: text })
    text = ''
  }
  let i = 0
  while (i < src.length) {
    // [label](href)
    if (src[i] === '[') {
      const close = src.indexOf('](', i)
      const end = close > -1 ? matchingParen(src, close + 1) : -1
      if (close > -1 && end > -1 && !src.slice(i + 1, close).includes('[')) {
        const href = safeHref(src.slice(close + 2, end))
        const label = parseInline(src.slice(i + 1, close))
        flush()
        if (href) out.push({ t: 'link', href, c: label })
        else out.push(...label)
        i = end + 1
        continue
      }
    }
    // **bold**
    if (src.startsWith('**', i)) {
      const end = src.indexOf('**', i + 2)
      if (end > i + 2) {
        flush()
        out.push({ t: 'bold', c: parseInline(src.slice(i + 2, end)) })
        i = end + 2
        continue
      }
    }
    // *italic* (not a stray asterisk, e.g. "5 * 3")
    if (src[i] === '*' && src[i + 1] && src[i + 1] !== ' ') {
      const end = src.indexOf('*', i + 1)
      if (end > i + 1 && src[end - 1] !== ' ') {
        flush()
        out.push({ t: 'italic', c: parseInline(src.slice(i + 1, end)) })
        i = end + 1
        continue
      }
    }
    text += src[i]
    i++
  }
  flush()
  return out
}

export function parseRichText(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n')
  const blocks: Block[] = []
  let para: Inline[][] = []
  let list: { t: 'ul' | 'ol'; items: Inline[][] } | null = null
  let quote: Inline[][] = []

  const flushAll = () => {
    if (para.length) blocks.push({ t: 'p', c: para })
    if (list) blocks.push(list)
    if (quote.length) blocks.push({ t: 'quote', c: quote })
    para = []
    list = null
    quote = []
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    const trimmed = line.trim()
    if (!trimmed) {
      flushAll()
      continue
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed)
    if (heading) {
      flushAll()
      blocks.push({ t: 'h', level: (heading[1].length + 1) as 2 | 3 | 4, c: parseInline(heading[2]) })
      continue
    }
    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      flushAll()
      blocks.push({ t: 'hr' })
      continue
    }
    const bullet = /^[-*•]\s+(.*)$/.exec(trimmed)
    const numbered = /^\d+[.)]\s+(.*)$/.exec(trimmed)
    if (bullet || numbered) {
      const kind = bullet ? 'ul' : 'ol'
      if (para.length || quote.length || (list && list.t !== kind)) flushAll()
      list ??= { t: kind, items: [] }
      list.items.push(parseInline((bullet ?? numbered)![1]))
      continue
    }
    const q = /^>\s?(.*)$/.exec(trimmed)
    if (q) {
      if (para.length || list) flushAll()
      quote.push(parseInline(q[1]))
      continue
    }
    if (list || quote.length) flushAll()
    para.push(parseInline(trimmed))
  }
  flushAll()
  return blocks
}

/** Plain-text version (meta descriptions, excerpts). */
export function plainText(src: string, max = 160): string {
  const flat = (c: Inline[]): string => c.map((n) => (n.t === 'text' ? n.v : flat(n.c))).join('')
  const text = parseRichText(src)
    .map((b) =>
      b.t === 'hr' ? '' : b.t === 'h' ? flat(b.c) : b.t === 'ul' || b.t === 'ol' ? b.items.map(flat).join(', ') : b.c.map(flat).join(' ')
    )
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? text.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : text
}
