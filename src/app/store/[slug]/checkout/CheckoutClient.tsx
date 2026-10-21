"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  CreditCard,
  Building2,
  Loader2,
  CheckCircle2,
  Tag,
  ChevronDown,
  ChevronUp,
  X,
  Copy,
  Check,
  HandCoins,
  MapPin,
  Receipt,
  Store as StoreIcon,
  Truck,
  Gift,
} from "lucide-react";
import { useCart } from "@/components/storefront/CartProvider";
import { useStore } from "@/lib/store-context";
import { formatCurrency } from "@/lib/utils";
import { clThumb } from "@/lib/cloudinary";
import toast from "react-hot-toast";
import { hasDeliveryOptions, quoteDelivery, type DeliverySettings, type PayOnDeliverySettings } from "@/lib/delivery";
import { computeTotals } from "@/lib/order-pricing";
import { loyaltyDiscount } from "@/lib/loyalty-shared";
import { openStatus, type WeeklyHours } from "@/lib/hours";
import { formatAppointment } from "@/lib/booking";

interface CheckoutProps {
  storeSlug: string;
  storeId: string;
  paymentMethods: string[];
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  paystackPublicKey?: string;
  returnPolicy?: string;
  /** Merchant-set estimate, e.g. "1–3 business days" */
  deliveryTimeFrame?: string;
  delivery?: DeliverySettings;
  payOnDelivery?: PayOnDeliverySettings;
  /** Opening hours / order-ahead / minimum order (food stores) */
  hours?: WeeklyHours | null;
  allowPreorders?: boolean;
  minimumOrder?: number | null;
}

interface AppliedCoupon {
  code: string;
  discountAmount: number;
  couponId: string;
}

export default function CheckoutClient({
  storeSlug,
  storeId,
  paymentMethods,
  bankName,
  accountNumber,
  accountName,
  returnPolicy,
  deliveryTimeFrame,
  delivery = { zones: [], freeDeliveryThreshold: null, pickupEnabled: false, pickupAddress: null },
  payOnDelivery = { enabled: false, depositPercent: 0 },
  hours = null,
  allowPreorders = true,
  minimumOrder = null,
}: CheckoutProps) {
  const { items, totalAmount, clearCart, addItem } = useCart();
  const { storeBase } = useStore();
  const homeHref = storeBase || "/";

  const [step, setStep] = useState<"details" | "payment" | "success">(
    "details",
  );
  const [loading, setLoading] = useState(false);
  const [payMethod, setPayMethod] = useState<"paystack" | "transfer" | "pay_on_delivery">(
    paymentMethods.includes("paystack") ? "paystack" : paymentMethods.includes("transfer") ? "transfer" : "pay_on_delivery",
  );
  // Appointment-only carts have nothing to deliver
  const allBookable = items.length > 0 && items.every((i) => i.booking);
  const showDeliveryChoice = hasDeliveryOptions(delivery) && !allBookable;
  const shopStatus = !allBookable ? openStatus(hours, new Date()) : null;
  const closedNoPreorder = !!shopStatus && !shopStatus.open && !allowPreorders;
  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup">(
    delivery.zones.length === 0 && delivery.pickupEnabled ? "pickup" : "delivery",
  );
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [placedDeposit, setPlacedDeposit] = useState(0);
  // Identifies this checkout for abandoned-cart capture; reused across
  // visits so a recovered cart converts the same session.
  const [checkoutToken, setCheckoutToken] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [copied, setCopied] = useState(false);
  // Capture total before cart is cleared so success screen shows correct amount
  const [placedTotal, setPlacedTotal] = useState(0);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(
    null,
  );
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  // Gift card / store credit and the loyalty reward (both re-checked by the server)
  const [giftCodeInput, setGiftCodeInput] = useState("");
  const [appliedGift, setAppliedGift] = useState<{ code: string; balance: number } | null>(null);
  const [checkingGift, setCheckingGift] = useState(false);
  const [showGiftInput, setShowGiftInput] = useState(false);
  const [loyalty, setLoyalty] = useState<{ eligible: boolean; remaining: number; percent: number; everyN: number } | null>(null);
  const [policyOpen, setPolicyOpen] = useState(false);

  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    deliveryAddress: "",
    deliveryCity: "",
    deliveryState: "",
    deliveryNote: "",
  });

  const change = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const discountAmount = appliedCoupon?.discountAmount ?? 0;
  const goodsTotal = Math.max(0, totalAmount - discountAmount);

  // Preview only — the order API recomputes everything from server prices.
  const quote = quoteDelivery(
    delivery,
    deliveryMethod === "pickup" ? { method: "pickup" } : { method: "delivery", zoneId },
    goodsTotal,
  );
  const loyaltyAmount = loyalty?.eligible ? loyaltyDiscount(goodsTotal, loyalty.percent) : 0;
  const totals = computeTotals({
    subtotal: totalAmount,
    discount: discountAmount + loyaltyAmount,
    deliveryFee: quote.ok ? quote.fee : 0,
    payOnDelivery: payMethod === "pay_on_delivery",
    depositPercent: payOnDelivery.depositPercent,
    giftCardBalance: appliedGift?.balance ?? 0,
  });
  const finalTotal = totals.total;
  // Minimum order is measured on goods after discounts (like the server)
  const minimumGap = minimumOrder && !allBookable ? Math.max(0, minimumOrder - goodsTotal) : 0;
  const blocked = closedNoPreorder || minimumGap > 0;
  const freeDeliveryGap =
    deliveryMethod === "delivery" && delivery.zones.length > 0 && delivery.freeDeliveryThreshold != null
      ? Math.max(0, delivery.freeDeliveryThreshold - goodsTotal)
      : 0;
  const zoneFeeLabel = (fee: number) =>
    fee === 0 || (delivery.freeDeliveryThreshold != null && goodsTotal >= delivery.freeDeliveryThreshold)
      ? "Free"
      : formatCurrency(fee);

  // Loyalty preview once we know who's ordering (keyed by phone number)
  const phoneDigits = form.customerPhone.replace(/\D/g, "");
  useEffect(() => {
    if (phoneDigits.length < 10) {
      setLoyalty(null);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/storefront/${storeSlug}/rewards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneDigits }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setLoyalty(d?.loyalty ?? null))
        .catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [phoneDigits, storeSlug]);

  // ── Checkout token + abandoned-cart recovery ───────────────────────────────
  const tokenKey = `checkout-token-${storeSlug}`;
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("failed") === "true") toast.error("Payment wasn't completed. You can try again.");

    const recover = params.get("recover");
    if (recover && /^[A-Za-z0-9_-]{16,64}$/.test(recover)) {
      setCheckoutToken(recover);
      try { localStorage.setItem(tokenKey, recover); } catch {}
      fetch(`/api/storefront/${storeSlug}/checkout-session?token=${encodeURIComponent(recover)}`)
        .then((r) => r.json())
        .then((data) => {
          if (!Array.isArray(data.items) || !data.items.length) {
            if (data.error) toast.error(data.error);
            return;
          }
          clearCart();
          for (const it of data.items) addItem(it);
          setForm((f) => ({
            ...f,
            customerName: f.customerName || data.customerName || "",
            customerPhone: f.customerPhone || data.customerPhone || "",
            customerEmail: f.customerEmail || data.customerEmail || "",
          }));
          toast.success("Welcome back — your cart is ready.");
        })
        .catch(() => {});
      return;
    }

    let token: string | null = null;
    try { token = localStorage.getItem(tokenKey); } catch {}
    if (!token) {
      token = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
      try { localStorage.setItem(tokenKey, token); } catch {}
    }
    setCheckoutToken(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save the in-progress checkout once there's a phone number to follow up on.
  const cartSignature = useMemo(
    () => items.map((i) => `${i.product_id}:${i.size ?? ""}:${i.quantity}`).join("|"),
    [items],
  );
  useEffect(() => {
    if (!checkoutToken || step === "success" || items.length === 0) return;
    if (form.customerPhone.replace(/\D/g, "").length < 10) return;
    const id = setTimeout(() => {
      fetch(`/api/storefront/${storeSlug}/checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: checkoutToken,
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          customerEmail: form.customerEmail,
          items: items.map((i) => ({ productId: i.product_id, quantity: Number(i.quantity), size: i.size ?? null })),
        }),
        keepalive: true,
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutToken, cartSignature, form.customerPhone, form.customerName, form.customerEmail, step]);

  if (items.length === 0 && step !== "success") {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">🛒</p>
        <p className="font-semibold text-surface-900 dark:text-white mb-2">
          Your cart is empty
        </p>
        <Link
          href={homeHref}
          className="text-sm font-semibold underline"
          style={{ color: "var(--sf-accent)" }}
        >
          Continue shopping
        </Link>
      </div>
    );
  }


  async function handleApplyGift() {
    const code = giftCodeInput.trim();
    if (!code) return;
    setCheckingGift(true);
    try {
      const res = await fetch(`/api/storefront/${storeSlug}/rewards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giftCardCode: code }),
      });
      const data = await res.json();
      if (!res.ok || !data.giftCard || data.giftCard.error) {
        toast.error(data.giftCard?.error ?? data.error ?? "Couldn't check that gift card");
        return;
      }
      setAppliedGift(data.giftCard);
      toast.success(`Gift card applied — ${formatCurrency(data.giftCard.balance)} available`);
    } catch {
      toast.error("Couldn't check that gift card");
    } finally {
      setCheckingGift(false);
    }
  }

  async function handleApplyCoupon() {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setValidatingCoupon(true);
    try {
      const res = await fetch(`/api/storefront/${storeSlug}/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, order_amount: totalAmount }),
      });
      const data = await res.json();
      if (!data.valid) {
        toast.error(data.error ?? "Invalid coupon code");
        return;
      }
      setAppliedCoupon({
        code,
        discountAmount: data.discount_amount,
        couponId: data.coupon_id,
      });
      toast.success(
        `Coupon applied! You save ${formatCurrency(data.discount_amount)}`,
      );
    } catch {
      toast.error("Failed to validate coupon");
    } finally {
      setValidatingCoupon(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
  }

  async function handleSubmitDetails(e: React.SyntheticEvent) {
    e.preventDefault();
    const needsAddress = deliveryMethod === "delivery" && !allBookable;
    if (!form.customerName || !form.customerPhone || (needsAddress && !form.deliveryAddress)) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!quote.ok) {
      toast.error(quote.error);
      return;
    }
    setStep("payment");
  }

  async function placeOrder() {
    setLoading(true);
    try {
      const res = await fetch(`/api/storefront/${storeSlug}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Only identifiers and choices — prices, discount, delivery fee and
        // total are all worked out by the server.
        body: JSON.stringify({
          ...form,
          storeId,
          items: items.map((i: import("@/types").CartItem) => ({
            productId: i.product_id,
            quantity: Number(i.quantity),
            size: i.size ?? undefined,
            booking: i.booking ? { startsAt: i.booking.startsAt, staffId: i.booking.staffId ?? null } : undefined,
          })),
          paymentMethod: payMethod,
          deliveryMethod: allBookable ? "appointment" : deliveryMethod,
          deliveryZoneId: deliveryMethod === "delivery" ? zoneId : null,
          couponCode: appliedCoupon?.code ?? null,
          giftCardCode: appliedGift?.code ?? null,
          checkoutToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const msg =
          typeof data.error === "string" ? data.error : "Failed to place order";
        throw new Error(msg);
      }

      setOrderNumber(data.orderNumber);
      setAccessToken(data.accessToken ?? null);
      // This checkout converted — start fresh next time.
      try { localStorage.removeItem(tokenKey); } catch {}

      if (data.paysOnlineNow) {
        const initRes = await fetch("/api/paystack/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: data.orderId,
            email: form.customerEmail || `${form.customerPhone}@noemail.com`,
          }),
        });
        const initData = await initRes.json();
        if (initData.authorization_url) {
          window.location.href = initData.authorization_url;
          return;
        }
        throw new Error("Paystack init failed");
      } else {
        // Save total BEFORE clearing cart — cart clear resets totalAmount to 0
        setPlacedTotal(Number(data.totals?.total ?? finalTotal));
        setPlacedDeposit(Number(data.totals?.deposit ?? 0));
        // Save to localStorage so customer can track from the track page
        try {
          const key = `recent-orders-${storeSlug}`;
          const prev = JSON.parse(localStorage.getItem(key) ?? "[]") as {
            orderNumber: string;
            phone: string;
            date: string;
          }[];
          const next = [
            {
              orderNumber: data.orderNumber,
              phone: form.customerPhone,
              date: new Date().toISOString(),
            },
            ...prev,
          ].slice(0, 5);
          localStorage.setItem(key, JSON.stringify(next));
        } catch {}
        clearCart();
        setStep("success");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-black text-surface-900 dark:text-white mb-1">
          Order placed!
        </h1>
        <p className="text-surface-500 dark:text-surface-400 mb-1">
          Order #{orderNumber}
        </p>

        {payMethod === "transfer" && placedTotal > 0 && (
          <div className="mt-6 p-5 rounded-2xl bg-surface-50 dark:bg-surface-900 border border-surface-100 dark:border-surface-800 text-left space-y-3">
            <p className="font-bold text-surface-900 dark:text-white">
              Bank Transfer Details
            </p>
            <div className="space-y-2 text-sm text-surface-600 dark:text-surface-400">
              {bankName && (
                <div className="flex justify-between gap-4">
                  <span className="shrink-0">Bank:</span>
                  <span className="font-medium text-surface-900 dark:text-white text-right">
                    {bankName}
                  </span>
                </div>
              )}
              {accountNumber && (
                <div className="flex justify-between gap-4">
                  <span className="shrink-0">Account No:</span>
                  <span className="font-bold text-surface-900 dark:text-white font-mono text-right">
                    {accountNumber}
                  </span>
                </div>
              )}
              {accountName && (
                <div className="flex justify-between gap-4">
                  <span className="shrink-0">Account Name:</span>
                  <span className="font-medium text-surface-900 dark:text-white text-right">
                    {accountName}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-4 pt-2 border-t border-surface-200 dark:border-surface-700">
                <span className="shrink-0">Amount:</span>
                <span className="font-black text-surface-900 dark:text-white">
                  {formatCurrency(placedTotal)}
                </span>
              </div>
            </div>
            <p className="text-xs text-surface-400 pt-1">
              Use your order number <strong>{orderNumber}</strong> as payment
              reference. Your order will be confirmed after payment
              verification.
            </p>
          </div>
        )}

        {payMethod === "pay_on_delivery" && (
          <div className="mt-6 p-5 rounded-2xl bg-surface-50 dark:bg-surface-900 border border-surface-100 dark:border-surface-800 text-left flex items-start gap-3">
            <HandCoins className="w-5 h-5 shrink-0 mt-0.5 text-surface-500" />
            <div>
              <p className="font-bold text-surface-900 dark:text-white">
                Pay {formatCurrency(placedTotal - placedDeposit)} on {deliveryMethod === "pickup" ? "pickup" : "delivery"}
              </p>
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
                Cash or transfer when your order arrives. The store will contact you to confirm.
              </p>
            </div>
          </div>
        )}

        {deliveryTimeFrame && deliveryMethod === "delivery" && (
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-surface-500 dark:text-surface-400">
            <Truck className="w-4 h-4" /> Estimated delivery: <span className="font-semibold text-surface-900 dark:text-white">{deliveryTimeFrame}</span>
          </p>
        )}

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          {accessToken && orderNumber && (
            <Link
              href={`${storeBase}/receipt/${encodeURIComponent(orderNumber)}?t=${accessToken}`}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            >
              <Receipt className="w-4 h-4" /> View receipt
            </Link>
          )}
          <Link
            href={`${storeBase}/track?order=${orderNumber}&phone=${encodeURIComponent(form.customerPhone)}`}
            className="px-6 py-3 rounded-xl font-bold text-sm text-[color:var(--sf-on-accent)]"
            style={{ backgroundColor: "var(--sf-accent)" }}
          >
            Track your order
          </Link>
          <Link
            href={homeHref}
            className="px-6 py-3 rounded-xl font-bold text-sm border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  function copyAccount() {
    if (!accountNumber) return;
    navigator.clipboard.writeText(accountNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── CTA button (shared between mobile bar and desktop summary) ────────────────
  const ctaButton =
    step === "details" ? (
      <button
        type="submit"
        form="checkout-form"
        disabled={blocked}
        className="w-full py-3.5 rounded-xl font-bold text-sm text-[color:var(--sf-on-accent)] hover:opacity-90 transition-all disabled:opacity-50"
        style={{ backgroundColor: "var(--sf-accent)" }}
      >
        Continue to payment →
      </button>
    ) : (
      <button
        onClick={
          payMethod === "transfer" ? () => setShowBankModal(true) : placeOrder
        }
        disabled={loading || blocked}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-[color:var(--sf-on-accent)] hover:opacity-90 transition-all disabled:opacity-60"
        style={{ backgroundColor: "var(--sf-accent)" }}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Processing...
          </>
        ) : payMethod === "paystack" ? (
          `Pay ${formatCurrency(finalTotal)}`
        ) : payMethod === "pay_on_delivery" && totals.deposit > 0 ? (
          `Pay ${formatCurrency(totals.deposit)} deposit`
        ) : (
          "Place order"
        )}
      </button>
    );

  // ── Main checkout layout ──────────────────────────────────────────────────────
  return (
    <div className="overflow-x-hidden">
      <div className="max-w-5xl mx-auto px-4 py-6 pb-28 lg:pb-8">
        <Link
          href={`/store/${storeSlug}`}
          className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to shop
        </Link>

        <h1 className="text-xl font-black text-surface-900 dark:text-white mb-6">
          Checkout
        </h1>

        {shopStatus && !shopStatus.open && (
          <div className={`mb-5 rounded-2xl px-4 py-3 text-sm ${closedNoPreorder ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300" : "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"}`}>
            <strong>We&apos;re closed right now.</strong>{" "}
            {closedNoPreorder
              ? `Ordering opens again ${shopStatus.label.replace(/^Closed · opens /, "")}.`
              : `You can still order — we'll prepare it when we open (${shopStatus.label.replace(/^Closed · opens /, "")}).`}
          </div>
        )}
        {minimumGap > 0 && (
          <div className="mb-5 rounded-2xl bg-surface-100 px-4 py-3 text-sm text-surface-700 dark:bg-surface-800 dark:text-surface-200">
            The minimum order is <strong>{formatCurrency(minimumOrder ?? 0)}</strong> — add {formatCurrency(minimumGap)} more to check out.
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* ── Left: form ── */}
          <div className="space-y-5 min-w-0">
            {/* Step 1: Details */}
            <section className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5">
              <h2 className="font-bold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-full text-xs font-black flex items-center justify-center text-[color:var(--sf-on-accent)] shrink-0"
                  style={{ backgroundColor: "var(--sf-accent)" }}
                >
                  1
                </span>
                Your details
              </h2>

              <form id="checkout-form" onSubmit={handleSubmitDetails}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                      Full name <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="customerName"
                      value={form.customerName}
                      onChange={change}
                      required
                      placeholder="e.g. Jane Doe"
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="customerPhone"
                      value={form.customerPhone}
                      onChange={change}
                      required
                      type="tel"
                      placeholder="080xxxxxxxx"
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                      Email (optional)
                    </label>
                    <input
                      name="customerEmail"
                      value={form.customerEmail}
                      onChange={change}
                      type="email"
                      placeholder="jane@example.com"
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] text-sm"
                    />
                  </div>

                  {deliveryMethod === "delivery" && !allBookable && (<>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                      Delivery address <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="deliveryAddress"
                      value={form.deliveryAddress}
                      onChange={change}
                      required
                      placeholder="Street address"
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                      City
                    </label>
                    <input
                      name="deliveryCity"
                      value={form.deliveryCity}
                      onChange={change}
                      placeholder="Lagos"
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                      State
                    </label>
                    <input
                      name="deliveryState"
                      value={form.deliveryState}
                      onChange={change}
                      placeholder="Lagos State"
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] text-sm"
                    />
                  </div>
                  </>)}

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                      Order note (optional)
                    </label>
                    <textarea
                      name="deliveryNote"
                      value={form.deliveryNote}
                      onChange={change}
                      rows={2}
                      placeholder="Any special instructions?"
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] text-sm resize-none"
                    />
                  </div>
                </div>
              </form>
            </section>

            {/* Delivery options (only for stores that set up areas / pickup) */}
            {showDeliveryChoice && (
              <section className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5">
                <h2 className="font-bold text-surface-900 dark:text-white mb-1 flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Delivery
                </h2>
                {deliveryTimeFrame && (
                  <p className="text-xs text-surface-400 mb-4">Usually arrives in {deliveryTimeFrame}</p>
                )}
                <div className={`grid gap-2 ${deliveryTimeFrame ? "" : "mt-3"}`}>
                  {delivery.zones.map((z) => {
                    const active = deliveryMethod === "delivery" && zoneId === z.id;
                    return (
                      <label
                        key={z.id}
                        className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${active ? "border-[var(--sf-accent)] bg-[var(--sf-accent)]/5" : "border-surface-200 dark:border-surface-700"}`}
                      >
                        <input
                          type="radio"
                          name="deliveryOption"
                          className="sr-only"
                          checked={active}
                          onChange={() => {
                            setDeliveryMethod("delivery");
                            setZoneId(z.id);
                          }}
                        />
                        <span className="flex items-center gap-2.5 text-sm font-medium text-surface-900 dark:text-white">
                          <MapPin className="w-4 h-4 text-surface-400 shrink-0" />
                          {z.name}
                        </span>
                        <span className="text-sm font-bold text-surface-900 dark:text-white shrink-0">{zoneFeeLabel(z.fee)}</span>
                      </label>
                    );
                  })}
                  {delivery.pickupEnabled && (
                    <label
                      className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${deliveryMethod === "pickup" ? "border-[var(--sf-accent)] bg-[var(--sf-accent)]/5" : "border-surface-200 dark:border-surface-700"}`}
                    >
                      <input
                        type="radio"
                        name="deliveryOption"
                        className="sr-only"
                        checked={deliveryMethod === "pickup"}
                        onChange={() => setDeliveryMethod("pickup")}
                      />
                      <span className="flex items-start gap-2.5 text-sm text-surface-900 dark:text-white">
                        <StoreIcon className="w-4 h-4 text-surface-400 shrink-0 mt-0.5" />
                        <span>
                          <span className="block font-medium">Pick up myself</span>
                          {delivery.pickupAddress && <span className="block text-xs text-surface-400">{delivery.pickupAddress}</span>}
                        </span>
                      </span>
                      <span className="text-sm font-bold text-surface-900 dark:text-white shrink-0">Free</span>
                    </label>
                  )}
                </div>
                {freeDeliveryGap > 0 && (
                  <p className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Add {formatCurrency(freeDeliveryGap)} more to get free delivery.
                  </p>
                )}
              </section>
            )}

            {/* Step 2: Payment method */}
            {step === "payment" && (
              <section className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5">
                <h2 className="font-bold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-full text-xs font-black flex items-center justify-center text-[color:var(--sf-on-accent)] shrink-0"
                    style={{ backgroundColor: "var(--sf-accent)" }}
                  >
                    2
                  </span>
                  Payment method
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {paymentMethods.includes("paystack") && (
                    <label
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${payMethod === "paystack" ? "border-[var(--sf-accent)] bg-[var(--sf-accent)]/5" : "border-surface-200 dark:border-surface-700"}`}
                    >
                      <input
                        type="radio"
                        name="payMethod"
                        value="paystack"
                        checked={payMethod === "paystack"}
                        onChange={() => setPayMethod("paystack")}
                        className="sr-only"
                      />
                      <CreditCard className="w-5 h-5 text-surface-600 dark:text-surface-300 shrink-0" />
                      <div>
                        <p className="font-semibold text-surface-900 dark:text-white text-sm">
                          Pay online
                        </p>
                        <p className="text-xs text-surface-400">
                          Cards, bank transfer via Paystack
                        </p>
                      </div>
                    </label>
                  )}

                  {paymentMethods.includes("transfer") && (
                    <label
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${payMethod === "transfer" ? "border-[var(--sf-accent)] bg-[var(--sf-accent)]/5" : "border-surface-200 dark:border-surface-700"}`}
                    >
                      <input
                        type="radio"
                        name="payMethod"
                        value="transfer"
                        checked={payMethod === "transfer"}
                        onChange={() => setPayMethod("transfer")}
                        className="sr-only"
                      />
                      <Building2 className="w-5 h-5 text-surface-600 dark:text-surface-300 shrink-0" />
                      <div>
                        <p className="font-semibold text-surface-900 dark:text-white text-sm">
                          Bank transfer
                        </p>
                        <p className="text-xs text-surface-400">
                          Pay manually to store&apos;s bank
                        </p>
                      </div>
                    </label>
                  )}

                  {paymentMethods.includes("pay_on_delivery") && (
                    <label
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${payMethod === "pay_on_delivery" ? "border-[var(--sf-accent)] bg-[var(--sf-accent)]/5" : "border-surface-200 dark:border-surface-700"}`}
                    >
                      <input
                        type="radio"
                        name="payMethod"
                        value="pay_on_delivery"
                        checked={payMethod === "pay_on_delivery"}
                        onChange={() => setPayMethod("pay_on_delivery")}
                        className="sr-only"
                      />
                      <HandCoins className="w-5 h-5 text-surface-600 dark:text-surface-300 shrink-0" />
                      <div>
                        <p className="font-semibold text-surface-900 dark:text-white text-sm">
                          Pay on {deliveryMethod === "pickup" ? "pickup" : "delivery"}
                        </p>
                        <p className="text-xs text-surface-400">
                          {payOnDelivery.depositPercent > 0
                            ? `${payOnDelivery.depositPercent}% deposit now, rest on arrival`
                            : "Cash or transfer when it arrives"}
                        </p>
                      </div>
                    </label>
                  )}
                </div>

                {payMethod === "pay_on_delivery" && totals.deposit > 0 && (
                  <p className="mt-4 p-4 rounded-xl bg-surface-50 dark:bg-surface-800 text-sm text-surface-600 dark:text-surface-300">
                    You&apos;ll pay a <strong className="text-surface-900 dark:text-white">{formatCurrency(totals.deposit)}</strong> deposit now with Paystack to confirm your order, and{" "}
                    <strong className="text-surface-900 dark:text-white">{formatCurrency(totals.total - totals.deposit)}</strong> when it arrives.
                  </p>
                )}

                {payMethod === "transfer" && bankName && (
                  <div className="mt-4 p-4 rounded-xl bg-surface-50 dark:bg-surface-800 text-sm space-y-2">
                    <p className="font-semibold text-surface-900 dark:text-white">
                      Bank account details:
                    </p>
                    <div className="flex justify-between gap-4 text-surface-600 dark:text-surface-400">
                      <span className="shrink-0">Bank:</span>
                      <span className="font-medium text-surface-900 dark:text-white text-right">
                        {bankName}
                      </span>
                    </div>
                    {accountNumber && (
                      <div className="flex justify-between gap-4 text-surface-600 dark:text-surface-400">
                        <span className="shrink-0">Account No:</span>
                        <span className="font-bold font-mono text-surface-900 dark:text-white text-right break-all">
                          {accountNumber}
                        </span>
                      </div>
                    )}
                    {accountName && (
                      <div className="flex justify-between gap-4 text-surface-600 dark:text-surface-400">
                        <span className="shrink-0">Name:</span>
                        <span className="font-medium text-surface-900 dark:text-white text-right">
                          {accountName}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {returnPolicy && (
                  <div className="mt-4 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setPolicyOpen((v) => !v)}
                      className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-surface-700 dark:text-surface-300 bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                    >
                      <span>Return &amp; Refund Policy</span>
                      {policyOpen ? (
                        <ChevronUp className="w-4 h-4 text-surface-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-surface-400" />
                      )}
                    </button>
                    {policyOpen && (
                      <div className="px-4 py-4 text-sm text-surface-600 dark:text-surface-400 whitespace-pre-wrap leading-relaxed">
                        {returnPolicy}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>

          {/* ── Right: Order summary ── */}
          <div className="min-w-0">
            <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5 lg:sticky lg:top-20">
              <h2 className="font-bold text-surface-900 dark:text-white mb-4">
                Order summary ({items.length} item
                {items.length !== 1 ? "s" : ""})
              </h2>

              {/* Cart items */}
              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div
                    key={`${item.product_id}:${item.size ?? ""}`}
                    className="flex items-center gap-3 min-w-0"
                  >
                    {item.image_url ? (
                      <Image
                        src={clThumb(item.image_url)}
                        alt={item.name}
                        width={44}
                        height={44}
                        className="w-11 h-11 rounded-lg object-cover border border-surface-100 dark:border-surface-700 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-surface-100 dark:bg-surface-800 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-surface-400">
                        {item.booking
                          ? `📅 ${formatAppointment(item.booking.startsAt)}${item.booking.staffName ? ` · ${item.booking.staffName}` : ""}`
                          : <>{item.size ? `${item.size} · ` : ""}Qty: {item.quantity}</>}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-surface-900 dark:text-white shrink-0">
                      {formatCurrency(Number(item.price) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Coupon */}
              <div className="mb-4">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <Tag className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                      <span className="text-sm font-bold text-green-700 dark:text-green-400 font-mono truncate">
                        {appliedCoupon.code}
                      </span>
                      <span className="text-xs text-green-600 dark:text-green-400 shrink-0">
                        -{formatCurrency(appliedCoupon.discountAmount)}
                      </span>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="p-1 rounded-lg text-green-500 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors shrink-0 ml-2"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden min-w-0">
                      <Tag className="w-4 h-4 text-surface-400 ml-3 shrink-0" />
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) =>
                          setCouponCode(e.target.value.toUpperCase())
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleApplyCoupon()
                        }
                        placeholder="Coupon code"
                        maxLength={30}
                        className="flex-1 min-w-0 px-3 py-2.5 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-400 text-sm font-mono focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleApplyCoupon}
                      disabled={validatingCoupon || !couponCode.trim()}
                      className="px-3 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 shrink-0"
                    >
                      {validatingCoupon ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Apply"
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Gift card / store credit */}
              <div className="mb-4">
                {appliedGift ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <Gift className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                      <span className="text-sm font-bold text-green-700 dark:text-green-400 font-mono truncate">{appliedGift.code}</span>
                      <span className="text-xs text-green-600 dark:text-green-400 shrink-0">{formatCurrency(appliedGift.balance)} balance</span>
                    </div>
                    <button
                      onClick={() => { setAppliedGift(null); setGiftCodeInput(""); }}
                      aria-label="Remove gift card"
                      className="p-1 rounded-lg text-green-500 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors shrink-0 ml-2"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : showGiftInput ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden min-w-0">
                      <Gift className="w-4 h-4 text-surface-400 ml-3 shrink-0" />
                      <input
                        type="text"
                        value={giftCodeInput}
                        onChange={(e) => setGiftCodeInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === "Enter" && handleApplyGift()}
                        placeholder="GIFT-XXXX-XXXX-XXXX"
                        maxLength={24}
                        autoFocus
                        className="flex-1 min-w-0 px-3 py-2.5 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-400 text-sm font-mono focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleApplyGift}
                      disabled={checkingGift || !giftCodeInput.trim()}
                      className="px-3 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 shrink-0"
                    >
                      {checkingGift ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowGiftInput(true)}
                    className="text-xs font-semibold text-surface-500 underline underline-offset-2 hover:text-surface-800 dark:hover:text-surface-200"
                  >
                    Have a gift card or store credit?
                  </button>
                )}
              </div>

              {loyalty && (
                <div
                  className={`mb-4 rounded-xl px-3 py-2.5 text-xs font-medium ${
                    loyalty.eligible
                      ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-surface-50 text-surface-600 dark:bg-surface-800/60 dark:text-surface-300"
                  }`}
                >
                  {loyalty.eligible
                    ? `🎉 Thanks for coming back! This order gets ${loyalty.percent}% off.`
                    : `${loyalty.remaining} more order${loyalty.remaining === 1 ? "" : "s"} after this one and you'll get ${loyalty.percent}% off.`}
                </div>
              )}

              {/* Totals */}
              <div className="border-t border-surface-100 dark:border-surface-800 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-surface-500 dark:text-surface-400">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-sm text-green-600 dark:text-green-400 font-medium">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span>-{formatCurrency(appliedCoupon.discountAmount)}</span>
                  </div>
                )}
                {loyaltyAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600 dark:text-green-400 font-medium">
                    <span>Loyalty reward ({loyalty?.percent}%)</span>
                    <span>-{formatCurrency(loyaltyAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-3 text-sm text-surface-500 dark:text-surface-400">
                  <span>{allBookable ? "Appointment" : deliveryMethod === "pickup" ? "Pickup" : "Delivery"}</span>
                  <span className="text-right">
                    {allBookable ? (
                      <span className="text-surface-500">At the store</span>
                    ) : deliveryMethod === "pickup" ? (
                      <span className="text-green-500">Free</span>
                    ) : delivery.zones.length === 0 ? (
                      <span className="text-green-500">{deliveryTimeFrame ?? "To be arranged"}</span>
                    ) : !zoneId ? (
                      <span className="text-surface-400">Choose your area</span>
                    ) : totals.deliveryFee === 0 ? (
                      <span className="text-green-500">Free</span>
                    ) : (
                      formatCurrency(totals.deliveryFee)
                    )}
                  </span>
                </div>
                {totals.giftCard > 0 && (
                  <div className="flex justify-between text-sm text-green-600 dark:text-green-400 font-medium">
                    <span>Gift card</span>
                    <span>-{formatCurrency(totals.giftCard)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-lg text-surface-900 dark:text-white border-t border-surface-100 dark:border-surface-800 pt-3 mt-1">
                  <span>Total</span>
                  <span>{formatCurrency(finalTotal)}</span>
                </div>
                {payMethod === "pay_on_delivery" && step === "payment" && (
                  <div className="space-y-1 text-sm">
                    {totals.deposit > 0 && (
                      <div className="flex justify-between text-surface-600 dark:text-surface-300">
                        <span>Deposit now</span>
                        <span className="font-semibold">{formatCurrency(totals.deposit)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-surface-600 dark:text-surface-300">
                      <span>Pay on {deliveryMethod === "pickup" ? "pickup" : "delivery"}</span>
                      <span className="font-semibold">{formatCurrency(totals.total - totals.deposit)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* CTA — desktop only (mobile uses sticky bottom bar) */}
              <div className="mt-4 hidden lg:block">{ctaButton}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile sticky CTA bar ── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 p-4 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-surface-200 dark:border-surface-800">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-surface-500 dark:text-surface-400">
              Total
            </span>
            <span className="font-black text-surface-900 dark:text-white">
              {formatCurrency(finalTotal)}
            </span>
          </div>
          {ctaButton}
        </div>
      </div>

      {/* ── Bank transfer confirmation modal ── */}
      {showBankModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowBankModal(false)}
          />

          <div className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl overflow-hidden">
            {/* header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-surface-800">
              <div className="flex items-center gap-2">
                <Building2
                  className="w-5 h-5"
                  style={{ color: "var(--sf-accent)" }}
                />
                <h3 className="font-black text-surface-900 dark:text-white text-base">
                  Bank Transfer Details
                </h3>
              </div>
              <button
                onClick={() => setShowBankModal(false)}
                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* body */}
            <div className="px-5 py-5 space-y-4">
              {/* amount banner */}
              <div
                className="rounded-xl px-4 py-3 text-center"
                style={{ backgroundColor: "var(--sf-accent)" }}
              >
                <p className="text-xs font-semibold text-black/60 mb-0.5">
                  Amount to pay
                </p>
                <p className="text-3xl font-black text-black">
                  {formatCurrency(finalTotal)}
                </p>
              </div>

              {/* account details */}
              <div className="rounded-xl border border-surface-200 dark:border-surface-700 divide-y divide-surface-100 dark:divide-surface-800 overflow-hidden">
                {bankName && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-surface-500 dark:text-surface-400 shrink-0">
                      Bank
                    </span>
                    <span className="text-sm font-semibold text-surface-900 dark:text-white text-right">
                      {bankName}
                    </span>
                  </div>
                )}
                {accountNumber && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-surface-500 dark:text-surface-400 shrink-0">
                      Account No
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black font-mono tracking-widest text-surface-900 dark:text-white">
                        {accountNumber}
                      </span>
                      <button
                        onClick={copyAccount}
                        className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                        title="Copy account number"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-surface-400" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
                {accountName && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-surface-500 dark:text-surface-400 shrink-0">
                      Account Name
                    </span>
                    <span className="text-sm font-semibold text-surface-900 dark:text-white text-right">
                      {accountName}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-xs text-surface-400 text-center leading-relaxed">
                Transfer the exact amount above to this account, then tap the
                button below to place your order.
              </p>
            </div>

            {/* footer */}
            <div className="px-5 pb-5 space-y-2">
              <button
                onClick={() => {
                  setShowBankModal(false);
                  placeOrder();
                }}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm text-[color:var(--sf-on-accent)] hover:opacity-90 transition-all disabled:opacity-60"
                style={{ backgroundColor: "var(--sf-accent)" }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Placing
                    order...
                  </>
                ) : (
                  "✓ I have made the payment"
                )}
              </button>
              <button
                onClick={() => setShowBankModal(false)}
                className="w-full py-3 rounded-xl text-sm font-semibold text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-white hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              >
                Go back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
