// The Duka Assistant's help guide: how every part of Duka works, plus
// practical lessons on selling online in Nigeria. The assistant searches this
// (search_help) instead of guessing, and links people to the right page.
//
// Keep it true to the product. Prices and plan limits are NOT written here:
// they change, so the assistant reads them live (get_plans, store_overview).

export interface HelpArticle {
  id: string;
  title: string;
  /** Extra words people use for this topic (helps search). */
  keywords: string;
  /** Where in the dashboard this lives, if anywhere. */
  url?: string;
  body: string;
}

export const HELP: HelpArticle[] = [
  /* ───────────────────────── Getting started ───────────────────────── */
  {
    id: "getting-started",
    title: "Getting started: your first 15 minutes on Duka",
    keywords: "start new begin setup set up launch first steps checklist onboarding how to start",
    url: "/dashboard",
    body: `Five things get a new store ready to sell:
1. **Add products** (Products → Add product). Good photos, a clear name and a price. Start with your 5–10 best sellers; you can add more later.
2. **Choose how you get paid** (Settings → Payments). Turn on **Duka Pay** so shoppers can pay by card, transfer or USSD and the money lands in your bank. You can also offer manual bank transfer and pay on delivery.
3. **Set delivery** (Settings → Delivery). Add your delivery areas and fees, or offer pickup.
4. **Upload your logo and pick a theme** (Settings, then Themes). This is what makes the store look like your brand.
5. **Share your store link** on WhatsApp status, Instagram bio and your group chats. Your link is shown on the Overview page.

The checklist on your Overview page tracks these for you.`,
  },
  {
    id: "store-link",
    title: "Your store link and how customers find you",
    keywords: "link url address subdomain share where is my store website domain",
    url: "/dashboard",
    body: `Every store gets its own address: **yourname.dukanigeria.com**. You chose the "yourname" part when you created the store.
- Copy it from the Overview page and share it everywhere you talk to customers.
- Each product also has its own link, so you can send one item straight to a customer.
- Want your own address like **yourbrand.com**? See "Custom domain".
- Verified stores can also appear on **Duka Discover**, where shoppers browse many Nigerian vendors in one place.`,
  },
  /* ───────────────────────── Products ───────────────────────── */
  {
    id: "products",
    title: "Adding and editing products",
    keywords: "product add create edit new item listing upload photo price stock variant size colour",
    url: "/dashboard/products",
    body: `Go to **Products → Add product**.
- **Photos:** up to several per product. The first photo is the one shoppers see in lists.
- **Price and compare-at price:** put the old price in "compare-at" to show a discount (shown crossed out).
- **Stock:** how many you have. At 0 the product shows as sold out automatically.
- **Options (sizes, colours):** add options and give each its own stock. The total stock is worked out for you.
- **Category:** helps shoppers browse and helps your store look organised.
- **Hide a product** without deleting it by switching it off (it stays in your list).
- **Feature a product** to push it to the top of your store.
- **Services** (haircuts, consultations) can be bookable products with time slots (see Bookings).

Plans have a limit on how many products you can list at once; the assistant can tell you yours.`,
  },
  {
    id: "categories",
    title: "Categories and subcategories",
    keywords: "category categories subcategory organise group collection menu",
    url: "/dashboard/categories",
    body: `Categories group your products (e.g. Shoes → Sneakers, Sandals). Create them in **Categories**, then pick one when adding a product.
Tips: keep it to 3–8 main categories, name them the way customers search ("Wigs", not "Hair Products Collection 2"), and put your best category first.`,
  },
  {
    id: "inventory",
    title: "Stock, low-stock alerts and inventory history",
    keywords: "stock inventory low stock out of stock restock alert quantity count",
    url: "/dashboard/inventory",
    body: `- Stock goes down automatically when an order is placed, and goes back up when you cancel an order.
- **Low-stock alerts:** set a threshold in Settings (or per product). You get a notification when an item drops to it.
- **Inventory page / stock history** (paid plans): every stock change with the reason (sale, edit, cancellation, point of sale), so you always know where stock went.
- **Back-in-stock alerts** (every plan): shoppers can ask to be told when a sold-out item returns.`,
  },
  /* ───────────────────────── Orders & payments ───────────────────────── */
  {
    id: "orders",
    title: "Managing orders: statuses and what each one means",
    keywords: "order orders status pending confirmed processing shipped delivered cancel cancelled manage fulfil",
    url: "/dashboard/orders",
    body: `Every order moves through these steps. Update them in **Orders** (or ask me):
- **Pending:** just placed. Check it and confirm.
- **Confirmed:** you've accepted it.
- **Processing:** you're packing it.
- **Shipped:** it's on the way.
- **Delivered:** the customer has it.
- **Cancelled:** the order is off. Its stock goes back automatically.

Payment has its own status: **paid**, **pending**, **awaiting confirmation** (a bank transfer you need to check), **deposit paid** (pay on delivery with a deposit), **refunded**.
Customers can follow their order with the receipt link, and on paid plans they get SMS/email updates automatically when you change the status.`,
  },
  {
    id: "duka-pay",
    title: "Duka Pay: accepting card, transfer and USSD payments",
    keywords: "duka pay paystack online payment card transfer ussd get paid payout bank account settlement fee charges money",
    url: "/dashboard/settings",
    body: `**Duka Pay** lets shoppers pay online by card, bank transfer or USSD. Payments are confirmed instantly and the order is marked paid automatically.
- **Setup:** Settings → Payments → Duka Pay. Pick your bank and enter your account number; we check the account name with your bank.
- **Where the money goes:** straight to your bank account through Paystack. Duka never holds your money.
- **Fees:** a small Duka fee per successful payment plus Paystack's own processing fee, both taken from that payment. (Ask me for the current Duka fee.)
- **When you get it:** Paystack pays out on its settlement schedule, usually the next working day.
Without Duka Pay, shoppers can still use bank transfer or pay on delivery if you turn them on.`,
  },
  {
    id: "bank-transfer",
    title: "Manual bank transfer: how to confirm payments",
    keywords: "bank transfer manual confirm payment proof receipt awaiting confirmation account number",
    url: "/dashboard/orders?view=payment",
    body: `With manual bank transfer, the customer sends money to the account in your Settings, then you confirm it.
1. Open **Orders → Payments to confirm**.
2. **Check your bank app first** that the exact amount arrived from that customer.
3. Mark the order's payment as **Paid** (or ask me to, and confirm).
Never confirm from a screenshot alone: fake transfer receipts are common. Duka Pay avoids this completely because payments confirm themselves.`,
  },
  {
    id: "pay-on-delivery",
    title: "Pay on delivery (with an optional deposit)",
    keywords: "pay on delivery cash on delivery pod deposit cod",
    url: "/dashboard/settings",
    body: `Pay on delivery lets customers pay when the order arrives, which builds trust with new buyers.
To protect yourself from fake orders, set a **deposit percentage**: the customer pays that part online when ordering and the rest on delivery. Turn it on in Settings → Payments.`,
  },
  {
    id: "earnings",
    title: "Earnings and payouts",
    keywords: "earnings revenue payout money withdraw balance income sales total",
    url: "/dashboard/earnings",
    body: `**Earnings** shows what you've sold and what has been paid out. Duka Pay payments settle straight to your bank through Paystack, so there's nothing to withdraw from Duka; manual transfers and pay-on-delivery cash go to you directly.`,
  },
  /* ───────────────────────── Delivery ───────────────────────── */
  {
    id: "delivery",
    title: "Delivery zones, fees, pickup and minimum orders",
    keywords: "delivery shipping zone fee logistics pickup free delivery minimum order dispatch rider time",
    url: "/dashboard/settings",
    body: `Set delivery in **Settings → Delivery**:
- **Zones:** e.g. "Lekki – ₦2,000", "Mainland – ₦3,000", "Outside Lagos – ₦5,000". Shoppers pick their zone at checkout.
- **Free delivery over an amount:** a great way to raise your average order.
- **Pickup:** let customers collect from your shop for free.
- **Delivery time:** e.g. "1–3 days", shown to shoppers.
- **Minimum order:** stop very small orders that cost more to deliver than they earn.
Tip: price zones honestly. Surprise delivery costs are the top reason shoppers abandon checkout.`,
  },
  /* ───────────────────────── Look & feel ───────────────────────── */
  {
    id: "themes",
    title: "Themes: changing how your store looks",
    keywords: "theme design template look style colour font layout premium signature customise",
    url: "/dashboard/themes",
    body: `Pick a theme in **Themes**. There are free themes in every category and premium and **Signature** themes you buy once and keep.
- Preview any theme on your own products before choosing.
- Customise colours, fonts and sections (more options on higher tiers).
- Your products and orders don't change when you switch themes.`,
  },
  {
    id: "storefront",
    title: "Store page: banners, featured products and logo",
    keywords: "storefront banner hero featured logo homepage store page edit",
    url: "/dashboard/storefront",
    body: `In **Store page** you set your banner images, choose featured products and arrange what shoppers see first. Upload your logo in Settings. Use bright, uncluttered banner photos and change them for each season or sale.`,
  },
  {
    id: "custom-domain",
    title: "Custom domain (yourbrand.com)",
    keywords: "custom domain own domain dns cname website address yourbrand",
    url: "/dashboard/settings",
    body: `On paid plans you can use your own address, like **shop.yourbrand.com**.
1. Buy the domain from any registrar (Whogohost, Namecheap, GoDaddy…).
2. In Settings → Custom domain, enter it.
3. At your registrar, add the DNS record Duka shows you (a CNAME pointing to Duka).
4. Wait for it to verify (minutes to a few hours). SSL (the padlock) is set up for you.
Your dukanigeria.com link keeps working too.`,
  },
  {
    id: "pages-blog",
    title: "Pages and blog",
    keywords: "pages blog about us faq policy article post content seo",
    url: "/dashboard/pages",
    body: `Create pages like **About us**, **FAQ**, **Return policy** and, on paid plans, **blog posts**. Blog posts help people find you on Google: write about questions your customers ask ("How to care for a lace wig", "What size sneaker should I buy?").`,
  },
  /* ───────────────────────── Growth tools ───────────────────────── */
  {
    id: "growth",
    title: "Growth: reach more people and win repeat buyers",
    keywords: "growth grow marketing more customers repeat buyers returning welcome offer popup pop-up list contacts audience share links tracked links follow up follow-ups win back review emails automation broadcast newsletter blast referral refer friend word of mouth store credit",
    url: "/dashboard/growth",
    body: `**Growth** (in the menu) runs a simple loop: reach → capture → convert → bring back.
- **Share links that tell you what works:** copy a different link for WhatsApp, Instagram, TikTok, Facebook and X. Growth then shows which app brings buyers, not just visitors.
- **Welcome offer:** switch it on and new visitors see a pop-up offering 5–20% off their first order for their WhatsApp number (and email if they like). They join your list and get their own one-time code, filled in for them at checkout.
- **Your list:** everyone who agreed to hear from you (from the pop-up or the "send me offers" box at checkout). Message anyone from your own WhatsApp with one tap, or download it as a CSV.
- **Automatic follow-ups (Pro):** emails in your store's name: "your code is waiting" 2 days after sign-up, a thank-you and review request after delivery, and "we miss you" with a comeback code 45 days after someone's last order. Every email has a one-click stop link.
- **Broadcasts (Pro):** tell your whole list about new arrivals, a sale or news: by email (with up to 3 products and a discount code; one broadcast a day) or on WhatsApp, one tap per person from your own phone.
- **Customer referrals (Pro):** switch it on and each buyer gets their own friend code and link on their receipt and thank-you email. Their friend gets 5–20% off a first order; once it's delivered, the buyer earns store credit (₦500–₦5,000, you choose), spent like a gift card.
The page shows visitors, new contacts, first orders, returning buyers and sales from each step. Free shows the last 7 days; Pro shows 30 and 90.`,
  },
  {
    id: "whatsapp-shop",
    title: "WhatsApp shop: selling inside WhatsApp",
    keywords: "whatsapp shop bot chat catalog connect number business automation dm",
    url: "/dashboard/whatsapp",
    body: `Connect your WhatsApp Business number and customers can shop without leaving the chat: browse your products, add to cart, check out, and get order updates there.
- Connect in **WhatsApp shop** (log in with Facebook and pick your number).
- Your Duka products sync to WhatsApp's catalog automatically.
- "Message seller" questions are passed to you as notifications.
- Try it first with the simulator on that page: it's exactly what customers see.`,
  },
  {
    id: "sharing",
    title: "Sharing products on WhatsApp, Instagram and TikTok",
    keywords: "share sharing promote status instagram tiktok facebook post link marketing social",
    url: "/dashboard/products",
    body: `Every product has a share button and its own link with a photo preview.
- **WhatsApp status:** post 3–5 products a day, each with its link. Status is where most Nigerian buyers discover sellers.
- **Instagram:** put your store link in your bio; use "link in bio" stories.
- **TikTok:** short videos of the product in use; link in bio.
- **Sales channels** (paid plans) list your products on Google Shopping, Facebook and Instagram shops automatically.`,
  },
  {
    id: "coupons",
    title: "Coupons and discount codes",
    keywords: "coupon discount code promo promotion percent off influencer sale voucher",
    url: "/dashboard/coupons",
    body: `Create codes in **Coupons** (or ask me to). The Free plan can have 1 code switched on at a time; paid plans have as many as you like.
- **Percentage** (e.g. 10% off) or **fixed amount** (e.g. ₦2,000 off).
- Optional **minimum order**, **maximum number of uses** and **expiry date**.
Smart uses: a code for each influencer (to see who brings sales), "WELCOME10" for first orders, a weekend flash code with a short expiry. Avoid giving discounts so big you sell at a loss.`,
  },
  {
    id: "gift-cards-loyalty",
    title: "Gift cards, store credit and loyalty rewards",
    keywords: "gift card store credit loyalty reward points repeat customers voucher",
    url: "/dashboard/gift-cards",
    body: `Paid plans can sell **gift cards** (great for birthdays and festive seasons), refund customers as **store credit**, and reward repeat buyers with an automatic **loyalty** discount.`,
  },
  {
    id: "abandoned",
    title: "Abandoned carts: winning back shoppers who didn't pay",
    keywords: "abandoned cart checkout left without paying recover reminder",
    url: "/dashboard/abandoned",
    body: `When a shopper starts checkout but doesn't finish, Duka (paid plans) can remind them automatically. You can also see the list and message them yourself.
Why carts get abandoned: surprise delivery fees, no trusted payment option, slow replies. Clear delivery prices and Duka Pay fix most of it.`,
  },
  {
    id: "reels",
    title: "Reels: shoppable product videos",
    keywords: "reels video short video discover feed tiktok style shoppable",
    url: "/dashboard/reels",
    body: `Upload short vertical videos (15–60 seconds) and tag up to 5 products. The Free plan includes 1 reel a month; paid plans include more. They show on your store and in Duka's Discover feed. Show the product in use, start with the best moment, and keep it bright and steady.`,
  },
  {
    id: "reviews",
    title: "Customer reviews",
    keywords: "review reviews rating stars feedback testimonial",
    url: "/dashboard/reviews",
    body: `Customers can review products after buying. Manage them in **Reviews**. Reply politely to complaints; a calm, helpful reply to a bad review builds more trust than a page of perfect ones.`,
  },
  {
    id: "analytics",
    title: "Analytics: sales, visitors and top products",
    keywords: "analytics stats statistics report sales visitors traffic conversion best seller top products performance",
    url: "/dashboard/analytics",
    body: `**Analytics** shows sales, orders and visitors over time (the Free plan shows the last 7 days; paid plans add 30 and 90 days and traffic sources), your top products, where visitors come from, what shoppers search for (and couldn't find), and new vs returning customers. Check it weekly and stock more of what sells.`,
  },
  {
    id: "customers",
    title: "Customers list",
    keywords: "customers buyers crm contacts repeat customer list export",
    url: "/dashboard/customers",
    body: `**Customers** (every plan) lists everyone who ordered, how often and how much they spent. Use it to thank your best customers and to tell repeat buyers about new arrivals first.`,
  },
  {
    id: "bookings",
    title: "Bookings for services",
    keywords: "booking bookings appointment service schedule time slot salon barber consultation calendar",
    url: "/dashboard/bookings",
    body: `For services (salons, barbers, consultants, makeup artists), make a product **bookable** with a duration. Customers pick a time slot when ordering, and you see them in **Bookings** (paid plans).`,
  },
  {
    id: "pos",
    title: "Point of sale: selling in person",
    keywords: "pos point of sale in person walk in shop counter till physical store",
    url: "/dashboard/pos",
    body: `**Point of sale** records sales to walk-in customers (the Free plan includes 10 a month; paid plans are unlimited). It uses the same stock as your online store, so nothing gets sold twice.`,
  },
  {
    id: "team",
    title: "Team accounts and roles",
    keywords: "team staff manager employee access role permission invite login add staff invite staff staff account",
    url: "/dashboard/team",
    body: `Paid plans can invite staff with their own logins:
- **Manager:** everything except owner settings (billing, payouts, deleting the store).
- **Staff:** orders, bookings, point of sale and inventory only.
Only the owner can change payment details, plans and the team.`,
  },
  {
    id: "plans-billing",
    title: "Plans and billing",
    keywords: "plan plans pricing price upgrade downgrade pro subscription billing pay monthly yearly free",
    url: "/dashboard/billing",
    body: `Duka has a **Free** plan and paid plans. Free includes products, orders, categories, checkout, delivery, receipts, low-stock alerts, back-in-stock alerts and the customer list, plus a taste of Pro: analytics for the last 7 days, 1 discount code, 1 reel a month and 10 in-store sales a month. Paid plans remove those limits and add custom domain, AI tools, abandoned-cart recovery, customer SMS/email, team accounts, bookings, gift cards, stock history and more.
Upgrade or renew in **Billing**. Paying yearly is cheaper. If a paid plan ends, your store keeps working on Free.
(Ask me for current plan prices and what your plan includes.)`,
  },
  {
    id: "referral",
    title: "Refer & earn",
    keywords: "refer referral earn invite friend commission reward affiliate",
    url: "/dashboard/referral",
    body: `Invite other sellers to Duka with your referral link from **Refer & earn** and get rewarded when they join. The page shows your link, who joined and the current reward.`,
  },
  {
    id: "mobile-app",
    title: "The Duka app for sellers",
    keywords: "app mobile android phone play store notifications download",
    body: `Get the **Duka** seller app on Google Play to manage your store from your phone: instant new-order alerts, products, point of sale, sharing to WhatsApp and more.`,
  },
  {
    id: "account",
    title: "Account, password and security",
    keywords: "password reset forgot login account security delete account email change",
    url: "/dashboard/settings",
    body: `- **Forgot password:** use "Forgot password" on the login page.
- **Never share** your login or one-time codes. Duka staff will never ask for your password.
- **Delete account:** Settings, at the bottom. This removes your store permanently.`,
  },
  /* ───────────────────────── Selling lessons ───────────────────────── */
  {
    id: "photos",
    title: "Lesson: product photos that sell",
    keywords: "photo photos picture image photography camera lighting background tips",
    body: `Photos sell more than words online.
- **Light:** shoot near a window in daytime. Avoid flash and yellow bulbs.
- **Background:** plain and clean (a white wall, a cloth, a table).
- **Angles:** front, back, close-up of detail, and one in use (worn, held, on a table).
- **Real colours:** don't over-filter; returns happen when items look different.
- **Same style for all products** makes your store look professional.
A clean phone camera is enough. Wipe the lens first.`,
  },
  {
    id: "descriptions",
    title: "Lesson: writing product descriptions",
    keywords: "description write copy text title name product details",
    body: `Answer the questions a buyer would ask in your DMs:
- What is it, and who is it for?
- Size, material, colour options, what's included.
- How to use or care for it.
- Delivery time.
Use a clear name ("Men's black leather loafers, size 40–45", not "New arrival 🔥🔥"). Short paragraphs and bullet points read best on phones.`,
  },
  {
    id: "pricing",
    title: "Lesson: pricing your products",
    keywords: "price pricing profit margin cost how much charge",
    body: `Price = cost of the item + packaging + your time + a fair profit. Then check:
- What do similar sellers charge? You don't need to be cheapest; you need to be worth it (better photos, faster delivery, reliable service).
- Include card/transfer fees in your margin.
- Use compare-at prices for genuine discounts only; fake "slashed" prices hurt trust.
- Bundles ("2 for ₦…") raise the order value.`,
  },
  {
    id: "first-sale",
    title: "Lesson: getting your first sales",
    keywords: "first sale no sales no orders not selling get customers grow traffic",
    body: `If you have no orders yet:
1. **Tell people you know.** Share your link on WhatsApp status every day for a week and in relevant groups (without spamming).
2. **Make the first order easy:** offer pay on delivery (with a deposit) or a small "WELCOME" code.
3. **Show proof:** post photos of real packed orders and happy customers (with permission).
4. **Reply fast.** Most buyers move on if they wait more than an hour.
5. **Check your store as a shopper:** clear prices, delivery fees, working payment.
Consistency beats one big post.`,
  },
  {
    id: "trust",
    title: "Lesson: building trust as an online seller",
    keywords: "trust scam fake legit trustworthy credibility reviews proof",
    body: `Nigerian shoppers worry about being scammed. Show them you're real:
- Clear photos of your actual products, not stock images.
- Honest stock counts and delivery times.
- A real phone/WhatsApp number and a store address or pickup point.
- Reviews and photos from real customers.
- Duka Pay at checkout: payment goes through Paystack, which shoppers trust.
- A simple return/exchange policy page.`,
  },
  {
    id: "customer-service",
    title: "Lesson: great customer service",
    keywords: "customer service reply complaint refund return angry customer support",
    body: `- Reply quickly, even if it's "Let me check and get back to you in 10 minutes".
- Confirm orders and tell customers when it ships. Duka's status updates help.
- Handle complaints calmly: listen, apologise for the trouble, offer a fix (exchange, refund or store credit).
- Follow up after delivery: "Did it arrive well?" invites reviews and repeat orders.`,
  },
  {
    id: "seasons",
    title: "Lesson: planning sales around Nigerian seasons",
    keywords: "season seasonal christmas december detty december black friday valentine sallah eid easter back to school promotion campaign holiday",
    body: `Busy shopping seasons to plan for:
- **Valentine's (Feb)** gifts, **Easter**, **Eid/Sallah**, **back to school (Sept)**, **Black Friday (Nov)**, **Christmas & Detty December** (the biggest).
Plan 3–4 weeks ahead: stock up, prepare photos, create a coupon with an expiry, refresh your banner, and post a countdown on WhatsApp status. Gift cards sell well in December.`,
  },
];

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9₦ ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
const STOP = new Set(["the", "and", "for", "how", "what", "can", "you", "your", "with", "does", "are", "this", "that", "from", "have", "get", "want", "need", "about", "tell", "more", "please", "duka"]);

const stemOf = (w: string) => w.replace(/(ing|ed|es|s)$/, "");
const INDEX = HELP.map((a) => ({ a, title: words(a.title), kw: words(a.keywords), body: words(a.body), phrases: `${a.title} ${a.keywords}`.toLowerCase() }));
/** How rare a word is across the guide: telling words ("staff") outweigh common ones ("store"). */
const IDF = (() => {
  const df = new Map<string, number>();
  for (const d of INDEX) for (const w of new Set([...d.title, ...d.kw, ...d.body].map(stemOf))) df.set(w, (df.get(w) ?? 0) + 1);
  return (w: string) => Math.log(1 + HELP.length / (df.get(stemOf(w)) ?? 0.5));
})();

/**
 * Best-matching articles for a question: rare words count more, title and
 * keyword hits more than body hits, and two-word phrases ("no sales") get a
 * bonus. minScore ~7 means a real topic match (off-topic questions score lower).
 */
export function searchHelp(q: string, k = 3, minScore = 1): HelpArticle[] {
  return scoreHelp(q).filter((x) => x.s >= minScore).slice(0, k).map((x) => x.a);
}

/** Every article with its score for a question, best first. */
export function scoreHelp(q: string): { a: HelpArticle; s: number }[] {
  const qs = words(q);
  if (!qs.length) return HELP.filter((a) => a.id === "getting-started").map((a) => ({ a, s: 99 }));
  const raw = q.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 1);
  const pairs = raw.slice(1).map((w, i) => `${raw[i]} ${w}`);
  const scored = INDEX.map((d) => {
    let s = 0;
    for (const w of qs) {
      const stem = stemOf(w);
      // Same word, or the same stem with a short ending (sale/sales/selling), never "add" → "address"
      const has = (list: string[]) => list.some((x) => x === w || (stem.length >= 4 && x.startsWith(stem) && x.length - stem.length <= 4));
      const weight = IDF(w);
      if (has(d.title)) s += 2.5 * weight;
      if (has(d.kw)) s += 2 * weight;
      if (has(d.body)) s += 0.5 * weight;
    }
    for (const p of pairs) if (d.phrases.includes(p)) s += 6;
    return { a: d.a, s };
  })
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s);
  return scored;
}
