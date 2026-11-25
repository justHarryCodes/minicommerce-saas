// Ready-made vendor campaigns for Admin -> Campaigns. Each fills the builder
// (message, channels and a suggested audience); everything stays editable.
// Browser-safe: no server imports. Placeholders: {store}, {name}.
//
// Plan names match the plans table (Free / Pro / Business). Prices are left
// out on purpose so templates stay right when pricing changes; the CTA goes to
// Billing, which always shows current prices.
//
// Bodies use the custom elements in lib/email-elements.ts: "1." steps,
// "• 💬" icon rows, "> 💡" tips and "[[🚀 Title | line]]" feature tiles.

import type { Activity, Audience, Channel } from "./campaigns-shared";

export type TemplateGroup = "onboarding" | "growth" | "upgrade";

export interface CampaignTemplate {
  id: string;
  group: TemplateGroup;
  /** Shown in the template picker */
  title: string;
  goal: string;
  channels: Channel[];
  audience: Audience;
  name: string;
  subject: string;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  /** Look of the message: lib/email-themes.ts */
  theme: string;
}

const a = (x: { plans?: string[]; activity?: Activity[] }): Audience => x;

export const TEMPLATE_GROUPS: { id: TemplateGroup; label: string; hint: string }[] = [
  { id: "onboarding", label: "Onboarding", hint: "Get new vendors live and selling" },
  { id: "growth", label: "Growth", hint: "Help stores sell more" },
  { id: "upgrade", label: "Upgrade", hint: "Move stores to Pro and Business" },
];

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  /* ───────────────────────────── Onboarding ───────────────────────────── */
  {
    id: "welcome",
    group: "onboarding",
    title: "Welcome to Duka",
    goal: "Warm welcome + the 3 steps to a first sale",
    channels: ["email", "inapp"],
    audience: a({ activity: ["new_7d"] }),
    name: "Onboarding · Welcome",
    subject: "Welcome to Duka, {name} 🎉 3 steps to your first sale",
    headline: "Welcome to Duka, {name}!",
    body:
      "**{store}** is ready to go 🎉 Here's how new stores make their first sale this week:\n\n1. **Add 5+ products** with clear photos and prices. Snap a photo and let Duka's AI write the description.\n2. **Add your payout account** so customers can pay you by card, transfer or USSD.\n3. **Share your store link** on WhatsApp status, Instagram and TikTok.\n\n> 💡 Stores that do all three in their first week get their first order much sooner.\n\nWe're here if you need help. Just reply to this email.",
    ctaLabel: "Set up my store",
    ctaUrl: "/dashboard",
    theme: "celebrate",
  },
  {
    id: "first-products",
    group: "onboarding",
    title: "Add your first products",
    goal: "Stores with no products yet",
    channels: ["email", "push", "inapp"],
    audience: a({ activity: ["no_products"] }),
    name: "Onboarding · Add products",
    subject: "{store} is empty. Add your first product in 1 minute",
    headline: "Your shelves are empty, {name} 🛍️",
    body:
      "Customers can't buy from **{store}** until you add products. It takes about a minute:\n\n• 📸 **Take a photo** of the item\n• 🏷️ **Type a price**\n• ✨ **Let Duka's AI** write the title and description\n\n> 💡 Stores with 5 or more products get far more orders. Start with your best sellers.",
    ctaLabel: "Add a product",
    ctaUrl: "/dashboard/products/new",
    theme: "shop",
  },
  {
    id: "payout",
    group: "onboarding",
    title: "Set up payouts",
    goal: "Stores that can't receive money yet",
    channels: ["email", "inapp"],
    audience: a({ activity: ["no_payout"] }),
    name: "Onboarding · Payout account",
    subject: "Get paid for every order at {store}",
    headline: "Where should we send your money, {name}?",
    body:
      "Add your bank account (or switch on **Duka Pay**) so customers can pay **{store}** and the money lands in your account automatically.\n\n[[💳 Card | Visa, Mastercard, Verve]]\n[[🏦 Transfer | Confirmed for you]]\n[[📱 USSD | No smartphone needed]]\n\n> ⏱️ It takes 2 minutes and you only do it once.",
    ctaLabel: "Add payout account",
    ctaUrl: "/dashboard/settings#payments",
    theme: "money",
  },
  {
    id: "brand",
    group: "onboarding",
    title: "Make it look like your brand",
    goal: "Logo, colours and theme",
    channels: ["email", "inapp"],
    audience: a({ activity: ["new_7d"] }),
    name: "Onboarding · Brand your store",
    subject: "Make {store} look like your brand",
    headline: "First impressions sell, {name}",
    body:
      "Shoppers trust stores that look professional. Make **{store}** look like your brand:\n\n• 🖼️ **Upload your logo**\n• 🎨 **Pick your brand colour**\n• 🧩 **Choose a theme** that suits what you sell\n\n> 💡 Your brand colour also shows on the picture cards when you share products on WhatsApp.",
    ctaLabel: "Design my store",
    ctaUrl: "/dashboard/themes",
    theme: "brand",
  },
  {
    id: "share-store",
    group: "onboarding",
    title: "Share your store link",
    goal: "Live stores with no orders yet",
    channels: ["email", "push", "inapp"],
    audience: a({ activity: ["no_orders_30d"] }),
    name: "Onboarding · Share your store",
    subject: "{store} is live. Now let people know 📣",
    headline: "Your store is ready. Let's get your first order!",
    body:
      "The fastest first sale comes from people who already know you. Share **{store}** today:\n\n• 💬 Post your store link on your **WhatsApp status**\n• 📸 Put it in your **Instagram and TikTok bio**\n• 👥 Send a product to **5 friends**. Every link shows a picture card with the price\n\n> 👉 Tap **Share** in your dashboard to send it in one click.",
    ctaLabel: "Share my store",
    ctaUrl: "/dashboard/products",
    theme: "share",
  },

  /* ─────────────────────────────── Growth ─────────────────────────────── */
  {
    id: "whatsapp-shop",
    group: "growth",
    title: "Sell inside WhatsApp",
    goal: "Launch of the WhatsApp shop add-on",
    channels: ["email", "push", "inapp"],
    audience: a({}),
    name: "Growth · WhatsApp shop",
    subject: "New: let customers shop {store} inside WhatsApp",
    headline: "Your shop, inside WhatsApp 💬",
    body:
      "Customers can now browse **{store}**, add to cart and check out without leaving WhatsApp.\n\n[[🛒 Browse | Your catalog in chat]]\n[[💳 Pay | Checkout in the chat]]\n[[🔔 Updates | Order news, same chat]]\n\nYour products sync to WhatsApp's catalog automatically.\n\n> ⏱️ Connect your WhatsApp Business number in about 2 minutes.",
    ctaLabel: "Connect WhatsApp",
    ctaUrl: "/dashboard/whatsapp",
    theme: "whatsapp",
  },
  {
    id: "share-cards",
    group: "growth",
    title: "Share products that sell",
    goal: "Product share cards on WhatsApp / Instagram / TikTok",
    channels: ["email", "inapp"],
    audience: a({ activity: ["selling_30d", "no_orders_30d"] }),
    name: "Growth · Share product cards",
    subject: "Your products now look amazing on WhatsApp",
    headline: "Every product link is now a picture card",
    body:
      "When you share a product from **{store}**, people now see a card with the photo, price and your brand colour.\n\n• 💬 **WhatsApp**, Facebook, X and Telegram show it automatically\n• 📸 For **TikTok and Instagram**, tap Share then **Download card** and post it as a story with your link\n\n> 💡 A picture card gets far more taps than a plain link.",
    ctaLabel: "Share a product",
    ctaUrl: "/dashboard/products",
    theme: "share",
  },
  {
    id: "google",
    group: "growth",
    title: "Get found on Google",
    goal: "Search Console + better product details",
    channels: ["email", "inapp"],
    audience: a({}),
    name: "Growth · Google Search",
    subject: "Let customers find {store} on Google",
    headline: "Show up when people search, {name}",
    body:
      "Duka already prepares **{store}** for Google: prices, stock and photos are ready for Google's shopping results. Two things help most:\n\n1. Write **clear product names**: what it is, brand, size or colour.\n2. Connect your store to **Google Search Console** in Settings → Google Search. It's free.\n\n> 🔍 People search \"buy ankara gown Lagos\". Name your products the way they search.",
    ctaLabel: "Open Google settings",
    ctaUrl: "/dashboard/settings#google",
    theme: "search",
  },
  {
    id: "reactivate",
    group: "growth",
    title: "Win back quiet stores",
    goal: "No orders in 30 days",
    channels: ["email", "push"],
    audience: a({ activity: ["no_orders_30d"] }),
    name: "Growth · Reactivate",
    subject: "Quick ideas to get {store} orders this week",
    headline: "Let's get {store} moving again",
    body:
      "Quiet weeks happen. Here are 3 quick wins for **{store}**:\n\n• 🏷️ **Run a discount code** for your followers (10% off this weekend)\n• 📸 **Refresh photos** and restock your best sellers\n• 💬 **Post 3 products** on your WhatsApp status with your store link\n\n> ⚡ Small pushes bring customers back. Pick one and do it today.",
    ctaLabel: "Open my dashboard",
    ctaUrl: "/dashboard",
    theme: "boost",
  },
  {
    id: "festive",
    group: "growth",
    title: "Festive season prep",
    goal: "Black Friday / December / Sallah sales",
    channels: ["email", "push", "inapp"],
    audience: a({ activity: ["selling_30d"] }),
    name: "Growth · Festive season",
    subject: "Get {store} ready for the festive rush 🎄",
    headline: "Big shopping days are coming, {name}",
    body:
      "Shoppers spend the most in the run-up to the holidays. Get **{store}** ready now:\n\n1. **Restock** your best sellers\n2. Create a **holiday discount code**\n3. Set **delivery times** customers can count on\n4. Share your top products **every day** on WhatsApp status\n\n> 🎁 The stores that prepare early win the rush.",
    ctaLabel: "Prepare my store",
    ctaUrl: "/dashboard/products",
    theme: "festive",
  },

  /* ─────────────────────────────── Upgrade ─────────────────────────────── */
  {
    id: "pro-selling",
    group: "upgrade",
    title: "Pro for stores already selling",
    goal: "Free stores with recent orders",
    channels: ["email", "inapp"],
    audience: a({ plans: ["free"], activity: ["selling_30d"] }),
    name: "Upgrade · Pro for active sellers",
    subject: "{store} is selling 🎉 Here's how to sell more",
    headline: "You're getting orders, {name}!",
    body:
      "Stores like **{store}** grow faster on **Pro**:\n\n[[🌐 Own .com | yourbrand.com]]\n[[🛒 Cart reminders | Win back sales]]\n[[🏷️ Discount codes | Promos & influencers]]\n[[📈 Analytics | See what sells]]\n\nPlus more products and video reels.\n\n> 💰 Pay yearly and save 20%.",
    ctaLabel: "See Pro",
    ctaUrl: "/dashboard/billing",
    theme: "pro",
  },
  {
    id: "limit",
    group: "upgrade",
    title: "Running out of product space",
    goal: "Free stores close to their product limit",
    channels: ["email", "push", "inapp"],
    audience: a({ plans: ["free"], activity: ["near_limit"] }),
    name: "Upgrade · Product limit",
    subject: "Room for more products at {store}",
    headline: "Don't let your product limit hold you back",
    body:
      "The Free plan has a small product limit. **Pro** gives **{store}** room for many more products, plus:\n\n• 🎬 **Video reels**\n• 🏷️ **Discount codes**\n• 🛒 **Abandoned-cart reminders**\n\n> 📦 More products on display means more chances to sell.",
    ctaLabel: "Get more space",
    ctaUrl: "/dashboard/billing",
    theme: "space",
  },
  {
    id: "custom-domain",
    group: "upgrade",
    title: "Your own .com",
    goal: "Custom domain pitch",
    channels: ["email", "inapp"],
    audience: a({ plans: ["free"] }),
    name: "Upgrade · Custom domain",
    subject: "Put {store} on its own web address",
    headline: "yourbrand.com builds trust, {name}",
    body:
      "Customers trust a store with its own web address. On **Pro**, connect a domain you own (like **{store}.com.ng**) and your Duka store runs on it.\n\n• 🔒 Secure **https** included\n• 🔗 Your Duka link **keeps working** too\n• 🧾 Looks great on receipts, flyers and bags",
    ctaLabel: "Upgrade to Pro",
    ctaUrl: "/dashboard/billing",
    theme: "domain",
  },
  {
    id: "business",
    group: "upgrade",
    title: "Business for top sellers",
    goal: "Pro stores growing fast",
    channels: ["email", "inapp"],
    audience: a({ plans: ["paid"], activity: ["top_sellers"] }),
    name: "Upgrade · Business",
    subject: "{store} is one of our top sellers 🏆",
    headline: "Ready for Business, {name}?",
    body:
      "**{store}** is among the top sellers on Duka. **Business** is built for stores at your level:\n\n[[📦 Far more room | Products & reels]]\n[[✨ Every feature | All of Duka]]\n[[⚡ Higher limits | Everything in Pro]]\n\n> 💰 Pay yearly and save 20%.",
    ctaLabel: "See Business",
    ctaUrl: "/dashboard/billing",
    theme: "trophy",
  },
  {
    id: "renew",
    group: "upgrade",
    title: "Renew a lapsed plan",
    goal: "Stores whose paid plan expired",
    channels: ["email", "push", "inapp"],
    audience: a({ plans: ["lapsed"] }),
    name: "Upgrade · Renew lapsed plan",
    subject: "{store}'s plan has expired. Your pro tools are paused",
    headline: "Let's switch your tools back on, {name}",
    body:
      "Your paid plan for **{store}** has ended, so these tools are paused:\n\n• 🌐 Your **custom domain**\n• 🏷️ **Discount codes**\n• 🛒 **Abandoned-cart reminders**\n• 📈 **Analytics**\n\n> 🔁 Renew in a minute and everything comes back as you left it. Pay yearly and save 20%.",
    ctaLabel: "Renew my plan",
    ctaUrl: "/dashboard/billing",
    theme: "renew",
  },
];

export const templateById = (id: string | null | undefined) => CAMPAIGN_TEMPLATES.find((t) => t.id === id) ?? null;
