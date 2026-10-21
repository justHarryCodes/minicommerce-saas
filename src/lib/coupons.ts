import { queryOne } from "@/lib/db";
import { hasFeature } from "@/lib/plan";

export interface CouponRow {
  id: string;
  code?: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
}

export type CouponCheck =
  | { valid: true; coupon: CouponRow; discount: number }
  | { valid: false; error: string };

/** Pure: is this coupon usable on `amount`, and what does it take off? */
export function evaluateCoupon(coupon: CouponRow | null, amount: number, now = new Date()): CouponCheck {
  if (!coupon) return { valid: false, error: "Invalid or inactive coupon code" };
  if (coupon.expires_at && new Date(coupon.expires_at) < now) return { valid: false, error: "Coupon has expired" };
  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
    return { valid: false, error: "Coupon usage limit reached" };
  }
  if (amount < Number(coupon.min_order_amount)) {
    return { valid: false, error: `Minimum order amount is ₦${Number(coupon.min_order_amount).toLocaleString()}` };
  }
  const discount =
    coupon.discount_type === "percentage"
      ? Math.round((amount * Number(coupon.discount_value)) / 100)
      : Math.min(Number(coupon.discount_value), amount);
  return { valid: true, coupon, discount: Math.max(0, Math.min(discount, amount)) };
}

export async function checkCoupon(storeId: string, code: string, amount: number): Promise<CouponCheck> {
  if (!(await hasFeature(storeId, "coupons"))) return { valid: false, error: "Invalid or inactive coupon code" };
  const coupon = await queryOne<CouponRow>(
    `SELECT id, code, discount_type, discount_value, min_order_amount, max_uses, uses_count, expires_at
     FROM coupons WHERE store_id = $1 AND code = $2 AND is_active = true`,
    [storeId, code.trim().toUpperCase()]
  );
  return evaluateCoupon(coupon, amount);
}
