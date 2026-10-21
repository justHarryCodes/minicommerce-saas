// Client-safe types and starter templates for store pages.

export interface StorePage {
  id: string
  store_id?: string
  kind: 'page' | 'post'
  slug: string
  title: string
  body: string
  excerpt: string | null
  cover_url: string | null
  is_published?: boolean
  show_in_footer?: boolean
  sort_order?: number
  published_at: string | Date | null
  created_at?: string | Date
  updated_at?: string | Date
}

export interface FooterPageLink {
  slug: string
  title: string
}

export type PageTemplateId = 'about' | 'faq' | 'shipping' | 'returns' | 'contact'

export const PAGE_TEMPLATES: Record<PageTemplateId, { title: string; slug: string; body: string }> = {
  about: {
    title: 'About us',
    slug: 'about',
    body: `# Our story

{store} started with a simple idea: [say what you sell and why it matters to you].

## What we stand for
- **Quality** — every item is checked before it leaves us
- **Honest prices** — no hidden charges
- **Real people** — message us any time and a human replies

Thank you for shopping with us.`,
  },
  faq: {
    title: 'FAQ',
    slug: 'faq',
    body: `## How long does delivery take?
Lagos orders usually arrive in 1–2 days. Other states take 3–5 working days.

## How do I pay?
Pay online by card or bank transfer at checkout. [Add pay on delivery if you offer it.]

## Can I change or cancel my order?
Yes — message us as soon as possible and we'll sort it out before it ships.

## How do I track my order?
Use the **Track your order** link at the bottom of this page with your order number.`,
  },
  shipping: {
    title: 'Shipping policy',
    slug: 'shipping-policy',
    body: `## Where we deliver
We deliver across Nigeria. Delivery fees are shown at checkout before you pay.

## Processing time
Orders are packed within 1 working day of payment.

## Delivery time
- **Lagos:** 1–2 working days
- **Other states:** 3–5 working days

## Pickup
[If you offer pickup, say where and when.]

Questions? Message {store} any time.`,
  },
  returns: {
    title: 'Returns & refunds',
    slug: 'returns',
    body: `## Returns
If something isn't right, contact us within **7 days** of delivery. Items must be unused and in their original packaging.

## Refunds
Once we receive and check the item, we'll refund you or send store credit — your choice — within 5 working days.

## Exchanges
Need a different size or colour? We're happy to swap it if it's in stock.

## Not returnable
- Items marked final sale
- Perishable goods`,
  },
  contact: {
    title: 'Contact us',
    slug: 'contact',
    body: `We'd love to hear from you.

- **WhatsApp:** [add your number]
- **Email:** [add your email]
- **Hours:** Monday – Saturday, 9am – 6pm`,
  },
}
