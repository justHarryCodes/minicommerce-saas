// Campaign types shared by the server engine and the browser (builder, templates).
export type Channel = "email" | "push" | "inapp";
export const CHANNELS: Channel[] = ["email", "push", "inapp"];

export type Activity = "no_products" | "no_payout" | "near_limit" | "no_orders_30d" | "new_7d" | "selling_30d" | "top_sellers";
export const ACTIVITIES: { id: Activity; label: string }[] = [
  { id: "new_7d", label: "Joined in the last 7 days" },
  { id: "no_products", label: "No products yet" },
  { id: "no_payout", label: "No payout account" },
  { id: "near_limit", label: "Near their product limit (80%+)" },
  { id: "no_orders_30d", label: "No orders in 30 days" },
  { id: "selling_30d", label: "Had orders in 30 days" },
  { id: "top_sellers", label: "Top sellers (top 20% by 30-day sales)" },
];

export interface Audience {
  categories?: string[];
  /** "free" | "paid" | "lapsed" | a plan id */
  plans?: string[];
  activity?: Activity[];
  /** Nigerian states, from where the store's orders deliver to */
  states?: string[];
  /** Hand-picked stores (e.g. from Leads); other filters still narrow it */
  storeIds?: string[];
}
