/**
 * Normalise a Nigerian phone number to international digits (2348012345678)
 * for SMS / WhatsApp. Returns null when it doesn't look like a NG mobile.
 *   08012345678, 8012345678, +234 801 234 5678, 2348012345678 → 2348012345678
 */
export function toNgInternational(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("2340")) d = "234" + d.slice(4);
  if (d.startsWith("0") && d.length === 11) d = "234" + d.slice(1);
  if (d.length === 10 && /^[789]/.test(d)) d = "234" + d;
  return /^234[789]\d{9}$/.test(d) ? d : null;
}

/** wa.me link with a prefilled message, or null for an unusable number. */
export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  const n = toNgInternational(phone) ?? (phone ? phone.replace(/\D/g, "") || null : null);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}
