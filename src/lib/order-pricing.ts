import { depositFor } from "@/lib/delivery";

export interface OrderTotals {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  /** Gift card / store credit applied (already taken off `total`) */
  giftCard: number;
  /** What the customer still pays — Paystack, transfer or on delivery */
  total: number;
  /** Charged online now for pay-on-delivery orders (0 otherwise / no deposit) */
  deposit: number;
}

/**
 * The single source of truth for an order's money. Server-side it's fed
 * database prices; client-side the same function previews the summary.
 */
export function computeTotals(input: {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  payOnDelivery: boolean;
  depositPercent: number;
  /** Balance on an applied gift card; only what's needed is used */
  giftCardBalance?: number;
}): OrderTotals {
  const subtotal = Math.max(0, Math.round(input.subtotal));
  const discount = Math.min(subtotal, Math.max(0, Math.round(input.discount)));
  const deliveryFee = Math.max(0, Math.round(input.deliveryFee));
  const gross = subtotal - discount + deliveryFee;
  const giftCard = Math.min(gross, Math.max(0, Math.round(input.giftCardBalance ?? 0)));
  const total = gross - giftCard;
  const deposit = input.payOnDelivery ? depositFor(total, input.depositPercent) : 0;
  return { subtotal, discount, deliveryFee, giftCard, total, deposit };
}
