"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  CreditCard, CheckCircle, Clock, AlertTriangle, Shield, RefreshCw, Hourglass
} from "lucide-react";
import type { PlatformSettings } from "@/lib/admin-auth";
import { Tip, InfoTip } from "@/components/dashboard/Tip";

interface StoreInfo {
  id: string;
  name: string;
  status: string;
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  setupFeePaidAt: string | null;
  ninVerified: boolean;
  ninNumber: string | null;
  currentPlanId: string | null;
  planExpiresAt: string | null;
  registrationConfirmed: boolean;
}

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  max_products: number;
  is_active: boolean;
}

interface Payment {
  id: string;
  type: string;
  amount: number;
  payment_status: string;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

interface Props {
  store: StoreInfo;
  settings: PlatformSettings;
  payments: Payment[];
  plans: Plan[];
  currentPlan: Plan | null;
  success?: string;
  error?: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency", currency: "NGN", maximumFractionDigits: 0
  }).format(n);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
    active:           { icon: CheckCircle,    color: "#22c55e", label: "Active" },
    suspended:        { icon: AlertTriangle,  color: "#ef4444", label: "Suspended" },
    restricted:       { icon: Shield,         color: "#f97316", label: "Restricted" },
    pending_payment:  { icon: Clock,          color: "#f59e0b", label: "Pending Payment" },
    pending_approval: { icon: Hourglass,      color: "#3b82f6", label: "Pending Admin Approval" },
  };
  const { icon: Icon, color, label } = map[status] ?? { icon: Clock, color: "#71717a", label: status };
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color }}>
      <Icon className="w-4 h-4" /> {label}
    </span>
  );
}

export default function BillingClient({ store, settings, payments, plans, currentPlan, success, error }: Props) {
  const [loadingSetupFee, setLoadingSetupFee] = useState(false);
  const [loadingSubscribe, setLoadingSubscribe] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [ninInput, setNinInput] = useState(store.ninNumber ?? "");
  const [savingNin, setSavingNin] = useState(false);

  useEffect(() => {
    if (success === "paid") toast.success("Payment confirmed! Your store update is being processed.");
    if (success === "already_paid") toast.success("This payment was already processed.");
    if (error === "payment_failed") toast.error("Payment failed. Please try again.");
    if (error === "invalid_params") toast.error("Invalid payment reference.");
  }, [success, error]);

  const paySetupFee = async () => {
    setLoadingSetupFee(true);
    try {
      const res = await fetch("/api/billing/setup-fee", { method: "POST" });
      const data = await res.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        toast.error(data.error ?? "Failed to initiate payment");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoadingSetupFee(false);
    }
  };

  const subscribe = async () => {
    setLoadingSubscribe(true);
    try {
      const res = await fetch("/api/billing/subscribe", { method: "POST" });
      const data = await res.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        toast.error(data.error ?? "Failed to initiate payment");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoadingSubscribe(false);
    }
  };

  const subscribeToPlan = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/billing/subscribe-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });
      const data = await res.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        toast.error(data.error ?? "Failed to initiate payment");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoadingPlan(null);
    }
  };

  const saveNin = async () => {
    if (!ninInput.trim() || ninInput.trim().length < 11) {
      toast.error("Please enter a valid 11-digit NIN");
      return;
    }
    setSavingNin(true);
    try {
      const res = await fetch("/api/stores/nin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nin: ninInput.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("NIN submitted for verification");
      } else {
        toast.error(data.error ?? "Failed to save NIN");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSavingNin(false);
    }
  };

  const isSetupActive =
    store.subscriptionStatus === "setup_fee_paid" ||
    store.subscriptionStatus === "subscribed";

  const expiresAt = store.subscriptionExpiresAt
    ? new Date(store.subscriptionExpiresAt)
    : null;

  const isExpired = expiresAt ? expiresAt < new Date() : false;

  const planExpiresAt = store.planExpiresAt ? new Date(store.planExpiresAt) : null;
  const isPlanActive = planExpiresAt ? planExpiresAt > new Date() : false;

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black mb-1" style={{ color: "var(--text-primary)" }}>
          Billing & Subscription
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Manage your store subscription and verification status
        </p>
      </div>

      {/* Billing guide */}
      <Tip id="billing-guide" variant="info">
        <strong>How billing works:</strong> Pay the one-time setup fee to submit your store for admin approval. Once approved your store goes live. If plan subscriptions are required, subscribe to a plan to list products. NIN verification adds a trust badge to your storefront.
      </Tip>

      {/* Account status */}
      <div className="rounded-2xl border p-5 mb-5 mt-5 flex items-center justify-between"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
            Account Status
          </p>
          <StatusBadge status={store.status} />
        </div>
        {expiresAt && (
          <div className="text-right">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {isExpired ? "Expired" : "Active until"}
            </p>
            <p className="text-sm font-semibold" style={{ color: isExpired ? "#ef4444" : "var(--text-primary)" }}>
              {expiresAt.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        )}
      </div>

      {/* Pending approval notice */}
      {store.status === "pending_approval" && (
        <div className="rounded-2xl border p-5 mb-5 flex gap-3"
          style={{ background: "#3b82f615", borderColor: "#3b82f630" }}>
          <Hourglass className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#2563eb" }} />
          <div>
            <p className="font-semibold text-sm mb-1" style={{ color: "#1d4ed8" }}>Awaiting admin confirmation</p>
            <p className="text-xs leading-relaxed" style={{ color: "#2563eb" }}>
              Your setup fee payment was received. An admin will review and confirm your registration shortly — usually within 24 hours. You&apos;ll be able to receive orders once confirmed.
            </p>
          </div>
        </div>
      )}

      {/* Setup fee */}
      {settings.require_setup_fee && (
        <div className="rounded-2xl border p-6 mb-5"
          style={{ background: "var(--bg)", borderColor: isSetupActive ? "#22c55e40" : "var(--border)" }}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="font-bold mb-1" style={{ color: "var(--text-primary)" }}>Setup Fee</h2>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                One-time payment to submit your store for activation. Valid for {settings.setup_fee_duration_months} month{settings.setup_fee_duration_months !== 1 ? "s" : ""}.
              </p>
            </div>
            <p className="text-2xl font-black shrink-0" style={{ color: "var(--text-primary)" }}>
              {fmt(settings.setup_fee_amount)}
            </p>
          </div>

          {isSetupActive ? (
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#16a34a" }}>
              <CheckCircle className="w-4 h-4" />
              {store.setupFeePaidAt
                ? `Paid on ${new Date(store.setupFeePaidAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}`
                : "Paid"}
            </div>
          ) : (
            <button
              onClick={paySetupFee}
              disabled={loadingSetupFee || store.status === "pending_approval"}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-black transition-all disabled:opacity-60 hover:opacity-90"
              style={{ background: "var(--accent)" }}
            >
              <CreditCard className="w-4 h-4" />
              {loadingSetupFee ? "Redirecting…" : `Pay ${fmt(settings.setup_fee_amount)} Setup Fee`}
            </button>
          )}
        </div>
      )}

      {/* Monthly subscription */}
      {settings.require_subscription && (
        <div className="rounded-2xl border p-6 mb-5"
          style={{ background: "var(--bg)", borderColor: store.subscriptionStatus === "subscribed" ? "#22c55e40" : "var(--border)" }}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="font-bold mb-1" style={{ color: "var(--text-primary)" }}>Monthly Subscription</h2>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Keep your store active after the setup period expires.
              </p>
            </div>
            <p className="text-2xl font-black shrink-0" style={{ color: "var(--text-primary)" }}>
              {fmt(settings.monthly_fee_amount)}<span className="text-sm font-medium">/mo</span>
            </p>
          </div>

          {store.subscriptionStatus === "subscribed" && !isExpired ? (
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#16a34a" }}>
              <CheckCircle className="w-4 h-4" />
              Active subscription
            </div>
          ) : (
            <button
              onClick={subscribe}
              disabled={
                loadingSubscribe ||
                (settings.require_setup_fee && !isSetupActive)
              }
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-black transition-all disabled:opacity-60 hover:opacity-90"
              style={{ background: "var(--accent)" }}
            >
              <RefreshCw className="w-4 h-4" />
              {loadingSubscribe
                ? "Redirecting…"
                : isExpired
                ? "Renew Subscription"
                : `Subscribe — ${fmt(settings.monthly_fee_amount)}/month`}
            </button>
          )}

          {settings.require_setup_fee && !isSetupActive && (
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              Pay the setup fee first to unlock monthly subscription.
            </p>
          )}
        </div>
      )}

      {/* Plan subscription */}
      {settings.require_plan_subscription && (
        <div className="rounded-2xl border p-6 mb-5"
          style={{ background: "var(--bg)", borderColor: isPlanActive ? "#22c55e40" : "var(--border)" }}>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-bold" style={{ color: "var(--text-primary)" }}>Product Plan</h2>
            <InfoTip content="A plan subscription controls how many products you can list at a time. Without an active plan you won't be able to add or keep products live on your store." />
          </div>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            Subscribe to a plan to list products on your store.
          </p>

          {isPlanActive && currentPlan ? (
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold mb-2" style={{ color: "#16a34a" }}>
                <CheckCircle className="w-4 h-4" />
                {currentPlan.name} Plan — active until {planExpiresAt?.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
              </div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Up to {currentPlan.max_products.toLocaleString()} products. Renew before expiry to avoid interruption.
              </p>
              {plans.length > 0 && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                  <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
                    Renew or switch plan:
                  </p>
                  <div className="grid gap-3">
                    {plans.map((plan) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        current={plan.id === store.currentPlanId}
                        loading={loadingPlan === plan.id}
                        onSubscribe={subscribeToPlan}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {plans.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  No plans are currently available. Contact support.
                </p>
              ) : (
                plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    current={false}
                    loading={loadingPlan === plan.id}
                    onSubscribe={subscribeToPlan}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* NIN Verification — always shown */}
      {(true || settings.require_nin_verification) && (
        <div className="rounded-2xl border p-6 mb-5"
          style={{ background: "var(--bg)", borderColor: store.ninVerified ? "#22c55e40" : "var(--border)" }}>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-bold" style={{ color: "var(--text-primary)" }}>NIN Verification</h2>
            <InfoTip content="Your NIN (National Identification Number) is the 11-digit number on your NIMC slip or NIN card. Once verified, a ✓ badge appears next to your store name, which builds shopper trust." />
          </div>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            Submit your National Identification Number for identity verification. An admin will review and verify it.
          </p>

          {store.ninVerified ? (
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#16a34a" }}>
              <CheckCircle className="w-4 h-4" />
              NIN Verified ✓
            </div>
          ) : store.ninNumber ? (
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#d97706" }}>
              <Clock className="w-4 h-4" />
              NIN submitted — pending admin review
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter your 11-digit NIN"
                value={ninInput}
                onChange={(e) => setNinInput(e.target.value.replace(/\D/g, "").slice(0, 11))}
                maxLength={11}
                className="flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none"
                style={{
                  background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-primary)"
                }}
              />
              <button
                onClick={saveNin}
                disabled={savingNin || ninInput.length < 11}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-black transition-all disabled:opacity-60 hover:opacity-90"
                style={{ background: "var(--accent)" }}
              >
                {savingNin ? "Saving…" : "Submit"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="rounded-2xl border overflow-hidden"
          style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <h2 className="font-bold" style={{ color: "var(--text-primary)" }}>Payment History</h2>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-semibold capitalize" style={{ color: "var(--text-primary)" }}>
                    {p.type.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {new Date(p.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
                    {p.period_end
                      ? ` · until ${new Date(p.period_end).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}`
                      : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                    {fmt(Number(p.amount))}
                  </p>
                  <p className="text-xs font-semibold"
                    style={{ color: p.payment_status === "paid" ? "#16a34a" : p.payment_status === "failed" ? "#dc2626" : "#d97706" }}>
                    {p.payment_status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan, current, loading, onSubscribe }: {
  plan: Plan;
  current: boolean;
  loading: boolean;
  onSubscribe: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border"
      style={{
        background: current ? "var(--bg-secondary)" : "var(--bg)",
        borderColor: current ? "var(--accent)" : "var(--border)",
      }}>
      <div>
        <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{plan.name}</p>
        {plan.description && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{plan.description}</p>
        )}
        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
          Up to {plan.max_products.toLocaleString()} products
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className="font-black text-lg" style={{ color: "var(--text-primary)" }}>
            {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(plan.price_monthly)}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>/month</p>
        </div>
        <button
          onClick={() => onSubscribe(plan.id)}
          disabled={loading}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-black transition-all disabled:opacity-60"
          style={{ background: "var(--accent)" }}
        >
          {loading ? "…" : current ? "Renew" : "Subscribe"}
        </button>
      </div>
    </div>
  );
}
