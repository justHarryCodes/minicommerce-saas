"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
} from "lucide-react";
import { useCart } from "@/components/storefront/CartProvider";
import { useStore } from "@/lib/store-context";
import { formatCurrency } from "@/lib/utils";
import { clThumb } from "@/lib/cloudinary";
import toast from "react-hot-toast";

interface CheckoutProps {
  storeSlug: string;
  storeId: string;
  paymentMethods: string[];
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  paystackPublicKey?: string;
  returnPolicy?: string;
}

interface AppliedCoupon {
  code: string;
  discountAmount: number;
  couponId: string;
}

// This is a Client Component — store data passed via parent server component
export default function CheckoutClient({
  storeSlug,
  storeId,
  paymentMethods,
  bankName,
  accountNumber,
  accountName,
  paystackPublicKey,
  returnPolicy,
}: CheckoutProps) {
  const router = useRouter();
  const { items, totalAmount, clearCart } = useCart();
  const { storeBase } = useStore();
  const homeHref = storeBase || "/";
  const [step, setStep] = useState<"details" | "payment" | "success">("details");
  const [loading, setLoading] = useState(false);
  const [payMethod, setPayMethod] = useState<"paystack" | "transfer">(
    paymentMethods.includes("paystack") ? "paystack" : "transfer"
  );
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Return policy state
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

  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const discountAmount = appliedCoupon?.discountAmount ?? 0;
  const finalTotal = Math.max(0, totalAmount - discountAmount);

  if (items.length === 0 && step !== "success") {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">🛒</p>
        <p className="font-semibold text-surface-900 dark:text-white mb-2">Your cart is empty</p>
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
      toast.success(`Coupon applied! You save ${formatCurrency(data.discount_amount)}`);
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

  async function handleSubmitDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerName || !form.customerPhone || !form.deliveryAddress) {
      toast.error("Please fill in all required fields");
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
        body: JSON.stringify({
          ...form,
          storeId,
          items: items.map((i: import("@/types").CartItem) => ({
            productId: i.product_id,
            quantity: Number(i.quantity),
            unitPrice: Number(i.price),
          })),
          paymentMethod: payMethod,
          totalAmount,
          couponCode: appliedCoupon?.code ?? null,
          discountAmount: appliedCoupon?.discountAmount ?? 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : "Failed to place order";
        throw new Error(msg);
      }

      setOrderId(data.orderId);
      setOrderNumber(data.orderNumber);

      if (payMethod === "paystack") {
        // Initialize Paystack
        const initRes = await fetch("/api/paystack/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: data.orderId,
            email: form.customerEmail || `${form.customerPhone}@noemail.com`,
            amount: finalTotal,
          }),
        });
        const initData = await initRes.json();
        if (initData.authorization_url) {
          window.location.href = initData.authorization_url;
          return;
        }
        throw new Error("Paystack init failed");
      } else {
        clearCart();
        setStep("success");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (step === "success") {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
        <h1 className="text-2xl font-black text-surface-900 dark:text-white mb-2">
          Order placed!
        </h1>
        <p className="text-surface-500 dark:text-surface-400 mb-2">
          Order #{orderNumber}
        </p>

        {payMethod === "transfer" && (
          <div className="mt-6 p-5 rounded-2xl bg-surface-50 dark:bg-surface-900 border border-surface-100 dark:border-surface-800 text-left space-y-3">
            <p className="font-bold text-surface-900 dark:text-white">Bank Transfer Details</p>
            <div className="space-y-1.5 text-sm text-surface-600 dark:text-surface-400">
              {bankName && (
                <div className="flex justify-between">
                  <span>Bank:</span>
                  <span className="font-medium text-surface-900 dark:text-white">{bankName}</span>
                </div>
              )}
              {accountNumber && (
                <div className="flex justify-between">
                  <span>Account No:</span>
                  <span className="font-bold text-surface-900 dark:text-white font-mono">
                    {accountNumber}
                  </span>
                </div>
              )}
              {accountName && (
                <div className="flex justify-between">
                  <span>Account Name:</span>
                  <span className="font-medium text-surface-900 dark:text-white">{accountName}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-surface-200 dark:border-surface-700">
                <span>Amount:</span>
                <span className="font-black text-surface-900 dark:text-white">
                  {formatCurrency(finalTotal)}
                </span>
              </div>
            </div>
            <p className="text-xs text-surface-400 pt-1">
              Use your order number <strong>{orderNumber}</strong> as payment reference. Your order
              will be confirmed after payment verification.
            </p>
          </div>
        )}

        <Link
          href={homeHref}
          className="mt-8 inline-block px-8 py-3 rounded-xl font-bold text-sm text-black"
          style={{ backgroundColor: "var(--sf-accent)" }}
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link
        href={`/store/${storeSlug}`}
        className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-900 dark:hover:text-white mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to shop
      </Link>

      <h1 className="text-2xl font-black text-surface-900 dark:text-white mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-[1fr_380px] gap-8">
        {/* Left: form */}
        <div className="space-y-6">
          {/* Step 1: Details */}
          <section className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-6">
            <h2 className="font-bold text-surface-900 dark:text-white mb-5 flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-full text-xs font-black flex items-center justify-center text-black"
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
                    className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-300 dark:placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                    Phone number <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="customerPhone"
                    value={form.customerPhone}
                    onChange={change}
                    required
                    type="tel"
                    placeholder="080xxxxxxxx"
                    className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-300 dark:placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] text-sm"
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
                    className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-300 dark:placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] text-sm"
                  />
                </div>

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
                    className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-300 dark:placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] text-sm"
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
                    className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-300 dark:placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] text-sm"
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
                    className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-300 dark:placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] text-sm"
                  />
                </div>

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
                    className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-300 dark:placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] text-sm resize-none"
                  />
                </div>
              </div>
            </form>
          </section>

          {/* Step 2: Payment method */}
          {step === "payment" && (
            <section className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-6">
              <h2 className="font-bold text-surface-900 dark:text-white mb-5 flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-full text-xs font-black flex items-center justify-center text-black"
                  style={{ backgroundColor: "var(--sf-accent)" }}
                >
                  2
                </span>
                Payment method
              </h2>

              <div className="grid sm:grid-cols-2 gap-3">
                {paymentMethods.includes("paystack") && (
                  <label
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      payMethod === "paystack"
                        ? "border-[var(--sf-accent)] bg-[var(--sf-accent)]/5"
                        : "border-surface-200 dark:border-surface-700"
                    }`}
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
                      <p className="text-xs text-surface-400">Cards, bank transfer via Paystack</p>
                    </div>
                  </label>
                )}

                {paymentMethods.includes("transfer") && (
                  <label
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      payMethod === "transfer"
                        ? "border-[var(--sf-accent)] bg-[var(--sf-accent)]/5"
                        : "border-surface-200 dark:border-surface-700"
                    }`}
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
                      <p className="text-xs text-surface-400">Pay manually to store&apos;s bank</p>
                    </div>
                  </label>
                )}
              </div>

              {payMethod === "transfer" && bankName && (
                <div className="mt-4 p-4 rounded-xl bg-surface-50 dark:bg-surface-800 text-sm space-y-1.5">
                  <p className="font-semibold text-surface-900 dark:text-white mb-2">
                    Bank account details:
                  </p>
                  <div className="flex justify-between text-surface-600 dark:text-surface-400">
                    <span>Bank:</span>
                    <span className="font-medium text-surface-900 dark:text-white">{bankName}</span>
                  </div>
                  {accountNumber && (
                    <div className="flex justify-between text-surface-600 dark:text-surface-400">
                      <span>Account No:</span>
                      <span className="font-bold font-mono text-surface-900 dark:text-white">
                        {accountNumber}
                      </span>
                    </div>
                  )}
                  {accountName && (
                    <div className="flex justify-between text-surface-600 dark:text-surface-400">
                      <span>Name:</span>
                      <span className="font-medium text-surface-900 dark:text-white">{accountName}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Return policy accordion */}
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

        {/* Right: Order summary */}
        <div>
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5 sticky top-20">
            <h2 className="font-bold text-surface-900 dark:text-white mb-4">
              Order summary ({items.length} item{items.length !== 1 ? "s" : ""})
            </h2>

            {/* Cart items */}
            <div className="space-y-3 mb-5">
              {items.map((item) => (
                <div key={item.product_id} className="flex items-center gap-3">
                  {item.image_url ? (
                    <img
                      src={clThumb(item.image_url)}
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover border border-surface-100 dark:border-surface-700 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-surface-100 dark:bg-surface-800 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-surface-400">Qty: {item.quantity}</p>
                  </div>
                  <span className="text-sm font-bold text-surface-900 dark:text-white shrink-0">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Coupon input */}
            <div className="mb-5">
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-bold text-green-700 dark:text-green-400 font-mono">
                      {appliedCoupon.code}
                    </span>
                    <span className="text-xs text-green-600 dark:text-green-400">
                      -{formatCurrency(appliedCoupon.discountAmount)}
                    </span>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="p-1 rounded-lg text-green-500 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
                    <Tag className="w-4 h-4 text-surface-400 ml-3 shrink-0" />
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                      placeholder="Coupon code"
                      maxLength={30}
                      className="flex-1 px-3 py-2.5 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-400 text-sm font-mono focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleApplyCoupon}
                    disabled={validatingCoupon || !couponCode.trim()}
                    className="px-3 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800"
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
              <div className="flex justify-between text-sm text-surface-500 dark:text-surface-400">
                <span>Delivery</span>
                <span className="text-green-500">To be arranged</span>
              </div>
              <div className="flex justify-between font-black text-lg text-surface-900 dark:text-white border-t border-surface-100 dark:border-surface-800 pt-3 mt-2">
                <span>Total</span>
                <span>{formatCurrency(finalTotal)}</span>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-5">
              {step === "details" ? (
                <button
                  type="submit"
                  form="checkout-form"
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-black hover:opacity-90 transition-all"
                  style={{ backgroundColor: "var(--sf-accent)" }}
                >
                  Continue to payment →
                </button>
              ) : (
                <button
                  onClick={placeOrder}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-black hover:opacity-90 transition-all disabled:opacity-60"
                  style={{ backgroundColor: "var(--sf-accent)" }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : payMethod === "paystack" ? (
                    "Pay with Paystack"
                  ) : (
                    "Place order"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
