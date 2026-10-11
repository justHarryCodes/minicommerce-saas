"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  CreditCard,
  Building2,
  Loader2,
  CheckCircle2,
  X,
  Copy,
  Check,
} from "lucide-react";
import { useCart } from "@/components/storefront/CartProvider";
import { formatCurrency } from "@/lib/utils";
import { clThumb } from "@/lib/cloudinary";
import toast from "react-hot-toast";

interface CheckoutProps {
  storeId: string;
  paymentMethods: string[];
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  whatsapp?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
  };
  // Result of a Paystack redirect, resolved server-side in page.tsx
  paystackResult?: "success" | "failed" | null;
  paidOrderNumber?: string | null;
}

const LOGIN_URL = "/account/login?next=%2Fcheckout";

export default function CheckoutClient({
  paymentMethods,
  bankName,
  accountNumber,
  accountName,
  customer,
  paystackResult = null,
  paidOrderNumber = null,
}: CheckoutProps) {
  const { items, totalAmount, clearCart } = useCart();

  const [step, setStep] = useState<"details" | "payment" | "success">(
    paystackResult === "success" ? "success" : "details",
  );
  const [loading, setLoading] = useState(false);
  const [payMethod, setPayMethod] = useState<"paystack" | "transfer">(
    paystackResult === "success" || paymentMethods.includes("paystack")
      ? "paystack"
      : "transfer",
  );
  const [orderNumber, setOrderNumber] = useState<string | null>(
    paidOrderNumber,
  );
  const [showBankModal, setShowBankModal] = useState(false);
  const [copied, setCopied] = useState(false);
  // Capture total before cart is cleared so success screen shows correct amount
  const [placedTotal, setPlacedTotal] = useState(0);

  // Prefilled from the authenticated customer's saved profile (server-provided)
  const [form, setForm] = useState({
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    deliveryAddress: customer.address,
    deliveryCity: customer.city,
    deliveryState: customer.state,
    deliveryNote: "",
  });

  const change = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  // Handle the return from Paystack (must stay above the early return below)
  useEffect(() => {
    if (paystackResult === "success") clearCart();
    if (paystackResult === "failed") {
      toast.error("Payment was not completed. You can try again.");
    }
    // Drop ?success / ?failed / ?order from the URL so a refresh doesn't repeat this
    if (paystackResult && typeof window !== "undefined") {
      window.history.replaceState(null, "", "/checkout");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (items.length === 0 && step !== "success") {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">🛒</p>
        <p className="font-semibold text-surface-900 dark:text-white mb-2">
          Your cart is empty
        </p>
        <Link
          href="/products"
          className="text-sm font-semibold underline"
          style={{ color: "var(--accent)" }}
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  function handleSubmitDetails(e: React.SyntheticEvent) {
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
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: items.map((i) => ({
            productId: i.product_id,
            quantity: Number(i.quantity),
          })),
          paymentMethod: payMethod,
          // Display total only: the server recomputes prices and uses this
          // just to detect a stale cart.
          totalAmount,
        }),
      });

      // Session expired mid-checkout → send back to login, then return here
      if (res.status === 401) {
        window.location.assign(LOGIN_URL);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        const msg =
          typeof data.error === "string" ? data.error : "Failed to place order";
        throw new Error(msg);
      }

      setOrderNumber(data.orderNumber);

      if (payMethod === "paystack") {
        // Server takes the email from the session and the amount from the order
        const initRes = await fetch("/api/paystack/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: data.orderId }),
        });

        if (initRes.status === 401) {
          window.location.assign(LOGIN_URL);
          return;
        }

        const initData = await initRes.json();
        if (initData.authorization_url) {
          window.location.href = initData.authorization_url;
          return;
        }
        throw new Error(
          typeof initData.error === "string"
            ? initData.error
            : "Paystack init failed",
        );
      } else {
        setPlacedTotal(totalAmount);
        clearCart();
        setStep("success");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // ── Success screen ──────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-black text-surface-900 dark:text-white mb-1">
          {payMethod === "paystack" ? "Payment received!" : "Order placed!"}
        </h1>
        <p className="text-surface-500 dark:text-surface-400 mb-1">
          Order #{orderNumber}
        </p>

        {payMethod === "transfer" && (
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
              reference. We&apos;ll confirm your order once payment is verified.
            </p>
          </div>
        )}

        <div className="mt-8 flex items-center justify-center">
          <Link
            href="/products"
            className="px-6 py-3 rounded-xl font-bold text-sm text-white"
            style={{ background: "var(--accent)" }}
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

  const ctaButton =
    step === "details" ? (
      <button
        type="submit"
        form="checkout-form"
        className="w-full py-3.5 rounded-xl font-bold text-sm text-white hover:opacity-90 transition-all"
        style={{ background: "var(--accent)" }}
      >
        Continue to payment →
      </button>
    ) : (
      <button
        onClick={
          payMethod === "transfer" ? () => setShowBankModal(true) : placeOrder
        }
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white hover:opacity-90 transition-all disabled:opacity-60"
        style={{ background: "var(--accent)" }}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Processing...
          </>
        ) : payMethod === "paystack" ? (
          "Pay with Paystack"
        ) : (
          "Place order"
        )}
      </button>
    );

  return (
    <div className="overflow-x-hidden">
      <div className="max-w-5xl mx-auto px-4 py-6 pb-28 lg:pb-8">
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to shop
        </Link>

        <h1
          className="text-xl font-black mb-6"
          style={{ color: "var(--text-primary)" }}
        >
          Checkout
        </h1>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* ── Left: form ── */}
          <div className="space-y-5 min-w-0">
            <section className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5">
              <h2 className="font-bold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-full text-xs font-black flex items-center justify-center text-white shrink-0"
                  style={{ background: "var(--accent)" }}
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
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 text-sm"
                      style={{ ["--tw-ring-color" as string]: "var(--accent)" }}
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
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                      Email
                    </label>
                    <input
                      name="customerEmail"
                      value={form.customerEmail}
                      readOnly
                      type="email"
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white focus:outline-none text-sm opacity-60 cursor-not-allowed"
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
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 text-sm"
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
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 text-sm"
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
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 text-sm"
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
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 text-sm resize-none"
                    />
                  </div>
                </div>
              </form>
            </section>

            {step === "payment" && (
              <section className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5">
                <h2 className="font-bold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-full text-xs font-black flex items-center justify-center text-white shrink-0"
                    style={{ background: "var(--accent)" }}
                  >
                    2
                  </span>
                  Payment method
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {paymentMethods.includes("paystack") && (
                    <label
                      className="flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all"
                      style={
                        payMethod === "paystack"
                          ? {
                              borderColor: "var(--accent)",
                              background: "var(--accent-light)",
                            }
                          : { borderColor: "var(--border)" }
                      }
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
                      className="flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all"
                      style={
                        payMethod === "transfer"
                          ? {
                              borderColor: "var(--accent)",
                              background: "var(--accent-light)",
                            }
                          : { borderColor: "var(--border)" }
                      }
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
                          Pay manually to our bank account
                        </p>
                      </div>
                    </label>
                  )}
                </div>

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
              </section>
            )}
          </div>

          {/* ── Right: Order summary ── */}
          <div className="min-w-0">
            <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5 lg:sticky lg:top-24">
              <h2 className="font-bold text-surface-900 dark:text-white mb-4">
                Order summary ({items.length} item
                {items.length !== 1 ? "s" : ""})
              </h2>

              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div
                    key={item.product_id}
                    className="flex items-center gap-3 min-w-0"
                  >
                    {item.image_url ? (
                      <img
                        src={clThumb(item.image_url)}
                        alt={item.name}
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
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-surface-900 dark:text-white shrink-0">
                      {formatCurrency(Number(item.price) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-surface-100 dark:border-surface-800 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-surface-500 dark:text-surface-400">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm text-surface-500 dark:text-surface-400">
                  <span>Delivery</span>
                  <span className="text-green-500">To be arranged</span>
                </div>
                <div className="flex justify-between font-black text-lg text-surface-900 dark:text-white border-t border-surface-100 dark:border-surface-800 pt-3 mt-1">
                  <span>Total</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>

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
              {formatCurrency(totalAmount)}
            </span>
          </div>
          {ctaButton}
        </div>
      </div>

      {/* ── Bank transfer confirmation modal ── */}
      {showBankModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowBankModal(false)}
          />

          <div className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-surface-800">
              <div className="flex items-center gap-2">
                <Building2
                  className="w-5 h-5"
                  style={{ color: "var(--accent)" }}
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

            <div className="px-5 py-5 space-y-4">
              <div
                className="rounded-xl px-4 py-3 text-center text-white"
                style={{ background: "var(--accent)" }}
              >
                <p className="text-xs font-semibold text-white/70 mb-0.5">
                  Amount to pay
                </p>
                <p className="text-3xl font-black">
                  {formatCurrency(totalAmount)}
                </p>
              </div>

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

            <div className="px-5 pb-5 space-y-2">
              <button
                onClick={() => {
                  setShowBankModal(false);
                  placeOrder();
                }}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm text-white hover:opacity-90 transition-all disabled:opacity-60"
                style={{ background: "var(--accent)" }}
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
