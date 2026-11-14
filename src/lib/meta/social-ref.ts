// Browser-safe: the localStorage key holding the WhatsApp cart link a
// checkout came from, so the order can be linked back to that chat.
export const socialRefKey = (storeSlug: string) => `duka_social_ref:${storeSlug}`;
