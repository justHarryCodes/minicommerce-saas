import { depositFor } from "@/lib/delivery";

export interface OrderTotals {
  subtotal: number;
  discount: number;
  deliveryFee: number;
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
}): OrderTotals {
  const subtotal = Math.max(0, Math.round(input.subtotal));
  const discount = Math.min(subtotal, Math.max(0, Math.round(input.discount)));
  const deliveryFee = Math.max(0, Math.round(input.deliveryFee));
  const total = subtotal - discount + deliveryFee;
  const deposit = input.payOnDelivery ? depositFor(total, input.depositPercent) : 0;
  return { subtotal, discount, deliveryFee, total, deposit };
}
