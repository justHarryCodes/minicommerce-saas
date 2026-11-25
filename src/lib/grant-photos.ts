// Photos on the Vendor Grant page: real Nigerian traders and workshops from
// Wikimedia Commons, re-hosted on Duka's Cloudinary (same files as the blog).
// Each one is credited on the page as its licence requires.

const BASE = "https://res.cloudinary.com/wnlu84s5/image/upload";
const BY_SA = { name: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" };
const CC0 = { name: "CC0 public domain", url: "https://creativecommons.org/publicdomain/zero/1.0/" };

export interface GrantPhoto {
  src: string;
  alt: string;
  author: string;
  page: string;
  licence: { name: string; url: string };
}

export const GRANT_PHOTOS = {
  fashion: {
    src: `${BASE}/v1795513115/duka-blog/cover-fashion-workshop.jpg`,
    alt: "Fashion designers at work in a tailoring workshop",
    author: "SpringfieldFashionAcademy",
    page: "https://commons.wikimedia.org/wiki/File:Springfield_Fashion_Designers_at_Work.jpg",
    licence: BY_SA,
  },
  trader: {
    src: `${BASE}/v1795513118/duka-blog/mile12-trader.jpg`,
    alt: "A trader displaying goods at Mile 12 market, Lagos",
    author: "Oludeleadewalephotography",
    page: "https://commons.wikimedia.org/wiki/File:Trader_displaying_their_goods.jpg",
    licence: BY_SA,
  },
  shoes: {
    src: `${BASE}/v1795513116/duka-blog/shoe-seller-kaduna.jpg`,
    alt: "A seller arranging shoes at a market stall in Kaduna",
    author: "Holiness Istifanus",
    page: "https://commons.wikimedia.org/wiki/File:A_man_selling_shoes_at_Narayi_small_market_Kaduna_01.jpg",
    licence: BY_SA,
  },
  market: {
    src: `${BASE}/v1795513114/duka-blog/cover-idumota-market.jpg`,
    alt: "Idumota market in Lagos, busy with traders and shoppers",
    author: "Sir Demo",
    page: "https://commons.wikimedia.org/wiki/File:IThe_biggest_market_in_West_Africa,_dumota_Market,_Lagos.jpg",
    licence: BY_SA,
  },
  phones: {
    src: `${BASE}/v1795513112/duka-blog/cover-phones.jpg`,
    alt: "Young women working together on their smartphones",
    author: "Btwien",
    page: "https://commons.wikimedia.org/wiki/File:Smart_Girls_with_Smart_Phones.jpg",
    licence: BY_SA,
  },
  chat: {
    src: `${BASE}/v1795513113/duka-blog/whatsapp-texting.jpg`,
    alt: "A phone open on a WhatsApp chat",
    author: "Helar Lukats",
    page: "https://commons.wikimedia.org/wiki/File:Whatsapp_texting.jpg",
    licence: BY_SA,
  },
  street: {
    src: `${BASE}/v1795513117/duka-blog/cover-computer-village.jpg`,
    alt: "A busy street at Computer Village, Ikeja",
    author: "Lightfast Media",
    page: "https://commons.wikimedia.org/wiki/File:COMPUTER_VILLAGE_3,_IKEJA.jpg",
    licence: BY_SA,
  },
  payment: {
    src: `${BASE}/v1795513111/duka-blog/cover-card-payment.jpg`,
    alt: "A customer paying by card",
    author: "Mañico",
    page: "https://commons.wikimedia.org/wiki/File:Card_Payment_(176811287).jpeg",
    licence: CC0,
  },
} satisfies Record<string, GrantPhoto>;

export type GrantPhotoKey = keyof typeof GRANT_PHOTOS;
