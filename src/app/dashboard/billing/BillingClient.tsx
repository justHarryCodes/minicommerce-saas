"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  CreditCard, CheckCircle, Clock, AlertTriangle, Shield,
  RefreshCw, Hourglass, Building2, Copy, Check, Loader2
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
  payment_method: string;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
}

interface Props {
  store: StoreInfo;
  settings: PlatformSettings;
  payments: Payment[];
  plans: Plan[];
  bankAccounts: BankAccount[];
  currentPlan: Plan | null;
  success?: string;
  error?: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency", currency: "NGN", maximumFractionDigits: 0,
  }).format(n);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
    active:           { icon: CheckCircle,   color: "#22c55e", label: "Active" },
    suspended:        { icon: AlertTriangle, color: "#ef4444", label: "Suspended" },
    restricted:       { icon: Shield,        color: "#f97316", label: "Restricted" },
    pending_payment:  { icon: Clock,         color: "#f59e0b", label: "Pending Payment" },
    pending_approval: { icon: Hourglass,     color: "#3b82f6", label: "Pending Admin Approval" },
  };
  const { icon: Icon, color, label } = map[status] ?? { icon: Clock, color: "#71717a", label: status };
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color }}>
      <Icon className="w-4 h-4" /> {label}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Bank Transfer Panel ────────────────────────────────────────────────────
function BankTransferPanel({
  type,
  planId,
  amount,
  bankAccounts,
  onSubmitted,
}: {
  type: "setup_fee" | "monthly" | "plan";
  planId?: string;
  amount: number;
  bankAccounts: BankAccount[];
  onSubmitted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, plan_id: planId ?? null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setDone(true);
      toast.success("Transfer recorded! An admin will confirm within 24 hours.");
      onSubmitted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#d97706" }}>
        <Clock className="w-4 h-4" />
        Transfer recorded — awaiting admin confirmation
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Account details */}
      {bankAccounts.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No bank accounts configured. Contact support.
        </p>
      ) : (
        bankAccounts.map((acct) => (
          <div
            key={acct.id}
            className="rounded-xl border p-4 space-y-2"
            style={{ background: "var(--bg-secondary, #f9fafb)", borderColor: "var(--border)" }}
          >
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              {acct.bank_name}
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xl font-black" style={{ color: "var(--text-primary)" }}>
                  {acct.account_number}
                </p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{acct.account_name}</p>
              </div>
              <CopyButton text={acct.account_number} />
            </div>
          </div>
        ))
      )}

      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Transfer exactly <strong>{fmt(amount)}</strong> to the account above, then click the button below.
        Your reference: <strong className="font-mono">{type.replace(/_/g, "-").toUpperCase()}-{Date.now().toString(36).toUpperCase().slice(-6)}</strong>
      </p>

      <button
        onClick={handleSubmit}
        disabled={loading || bankAccounts.length === 0}
        className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 hover:opacity-90"
        style={{ background: "#16a34a", color: "#fff" }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {loading ? "Submitting…" : "I've made this transfer"}
      </button>
    </div>
  );
}

// ── Payment method tabs ────────────────────────────────────────────────────
type PayMethod = "paystack" | "transfer";

function PaymentSection({
  type,
  planId,
  amount,
  bankAccounts,
  canPayPaystack,
  paystackLabel,
  onPaystack,
  paystackLoading,
  onTransferSubmitted,
}: {
  type: "setup_fee" | "monthly" | "plan";
  planId?: string;
  amount: number;
  bankAccounts: BankAccount[];
  canPayPaystack: boolean;
  paystackLabel: string;
  onPaystack: () => void;
  paystackLoading: boolean;
  onTransferSubmitted: () => void;
}) {
  const [method, setMethod] = useState<PayMethod>("paystack");

  return (
    <div>
      {/* Method selector */}
      <div className="flex gap-1 p-1 rounded-xl w-fit mb-4"
        style={{ background: "var(--bg-secondary, #f3f4f6)" }}>
        {([
          ["paystack", <CreditCard key="c" className="w-3.5 h-3.5" />, "Pay online"],
          ["transfer", <Building2 key="b" className="w-3.5 h-3.5" />, "Bank transfer"],
        ] as [PayMethod, React.ReactNode, string][]).map(([key, icon, label]) => (
          <button
            key={key}
            onClick={() => setMethod(key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: method === key ? "var(--bg, #fff)" : "transparent",
              color: method === key ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: method === key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {method === "paystack" ? (
        <button
          onClick={onPaystack}
          disabled={paystackLoading || !canPayPaystack}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-black transition-all disabled:opacity-60 hover:opacity-90"
          style={{ background: "var(--accent)" }}
        >
          <CreditCard className="w-4 h-4" />
          {paystackLoading ? "Redirecting…" : paystackLabel}
        </button>
      ) : (
        <BankTransferPanel
          type={type}
          planId={planId}
          amount={amount}
          bankAccounts={bankAccounts}
          onSubmitted={onTransferSubmitted}
        />
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function BillingClient({
  store, settings, payments, plans, bankAccounts, currentPlan, success, error,
}: Props) {
  const [loadingSetupFee, setLoadingSetupFee]   = useState(false);
  const [loadingSubscribe, setLoadingSubscribe] = useState(false);
  const [loadingPlan, setLoadingPlan]           = useState<string | null>(null);
  const[pendingTransfer, setPendingTransfer]   = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (success === "paid")         toast.success("Payment confirmed! Your store update is being processed.");
    if (success === "already_paid") toast.success("This payment was already processed.");
    if (error === "payment_failed") toast.error("Payment failed. Please try again.");
    if (error === "invalid_params") toast.error("Invalid payment reference.");
  }, [success, error]);

  // Check for existing pending_transfer payments from history
  useEffect(() => {
    const pending: Record<string, boolean> = {};
    for (const p of payments) {
      if (p.payment_status === "pending_transfer") pending[p.type] = true;
    }
    setPendingTransfer(pending);
  }, [payments]);

  const paySetupFee = async () => {
    setLoadingSetupFee(true);
    try {
      const res = await fetch("/api/billing/setup-fee", { method: "POST" });
      const data = await res.json();
      if (data.authorization_url) window.location.href = data.authorization_url;
      else toast.error(data.error ?? "Failed to initiate payment");
    } catch { toast.error("Network error"); }
    finally { setLoadingSetupFee(false); }
  };

  const subscribe = async () => {
    setLoadingSubscribe(true);
    try {
      const res = await fetch("/api/billing/subscribe", { method: "POST" });
      const data = await res.json();
      if (data.authorization_url) window.location.href = data.authorization_url;
      else toast.error(data.error ?? "Failed to initiate payment");
    } catch { toast.error("Network error"); }
    finally { setLoadingSubscribe(false); }
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
      if (data.authorization_url) window.location.href = data.authorization_url;
      else toast.error(data.error ?? "Failed to initiate payment");
    } catch { toast.error("Network error"); }
    finally { setLoadingPlan(null); }
  };

  const isSetupActive = store.subscriptionStatus === "setup_fee_paid" || store.subscriptionStatus === "subscribed";
  const expiresAt     = store.subscriptionExpiresAt ? new Date(store.subscriptionExpiresAt) : null;
  const isExpired     = expiresAt ? expiresAt < new Date() : false;
  const planExpiresAt = store.planExpiresAt ? new Date(store.planExpiresAt) : null;
  const isPlanActive  = planExpiresAt ? planExpiresAt > new Date() : false;

  const PAYMENT_STATUS_COLORS: Record<string, string> = {
    paid:             "#16a34a",
    pending:          "#d97706",
    pending_transfer: "#d97706",
    failed:           "#dc2626",
    rejected:         "#dc2626",
  };
  const PAYMENT_STATUS_LABELS: Record<string, string> = {
    paid:             "Paid",
    pending:          "Pending",
    pending_transfer: "Awaiting confirmation",
    failed:           "Failed",
    rejected:         "Rejected",
  };

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

      <Tip id="billing-guide" variant="info">
        <strong>How billing works:</strong> Pay the one-time setup fee to submit your store for admin approval. You can pay online via Paystack or make a bank transfer and click &quot;I&apos;ve made this transfer&quot; — admin will confirm within 24 hours.
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
              Your setup fee payment was received. An admin will review and confirm your registration shortly — usually within 24 hours.
            </p>
          </div>
        </div>
      )}

      {/* ── Setup fee ── */}
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
          ) : pendingTransfer.setup_fee ? (
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#d97706" }}>
              <Clock className="w-4 h-4" />
              Bank transfer submitted — awaiting admin confirmation
            </div>
          ) : store.status === "pending_approval" ? (
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#2563eb" }}>
              <Hourglass className="w-4 h-4" />
              Awaiting admin confirmation
            </div>
          ) : (
            <PaymentSection
              type="setup_fee"
              amount={settings.setup_fee_amount}
              bankAccounts={bankAccounts}
              canPayPaystack={store.status !== "pending_approval"}
              paystackLabel={`Pay ${fmt(settings.setup_fee_amount)} Setup Fee`}
              onPaystack={paySetupFee}
              paystackLoading={loadingSetupFee}
              onTransferSubmitted={() => setPendingTransfer(p => ({ ...p, setup_fee: true }))}
            />
          )}
        </div>
      )}

      {/* ── Monthly subscription ── */}
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
          ) : pendingTransfer.monthly ? (
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#d97706" }}>
              <Clock className="w-4 h-4" />
              Bank transfer submitted — awaiting admin confirmation
            </div>
          ) : (
            <>
              <PaymentSection
                type="monthly"
                amount={settings.monthly_fee_amount}
                bankAccounts={bankAccounts}
                canPayPaystack={!(settings.require_setup_fee && !isSetupActive)}
                paystackLabel={isExpired ? "Renew Subscription" : `Subscribe — ${fmt(settings.monthly_fee_amount)}/month`}
                onPaystack={subscribe}
                paystackLoading={loadingSubscribe}
                onTransferSubmitted={() => setPendingTransfer(p => ({ ...p, monthly: true }))}
              />
              {settings.require_setup_fee && !isSetupActive && (
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                  Pay the setup fee first to unlock monthly subscription.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Plan subscription ── */}
      {settings.require_plan_subscription && (
        <div className="rounded-2xl border p-6 mb-5"
          style={{ background: "var(--bg)", borderColor: isPlanActive ? "#22c55e40" : "var(--border)" }}>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-bold" style={{ color: "var(--text-primary)" }}>Product Plan</h2>
            <InfoTip content="A plan subscription controls how many products you can list. Without an active plan you won't be able to add products." />
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
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                Up to {currentPlan.max_products.toLocaleString()} products. Renew before expiry.
              </p>
              {plans.length > 0 && (
                <div className="pt-4 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
                  <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Renew or switch plan:</p>
                  {plans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      current={plan.id === store.currentPlanId}
                      loading={loadingPlan === plan.id}
                      bankAccounts={bankAccounts}
                      pendingTransfer={!!pendingTransfer[`plan_${plan.id}`]}
                      onSubscribe={subscribeToPlan}
                      onTransferSubmitted={() => setPendingTransfer(p => ({ ...p, [`plan_${plan.id}`]: true }))}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {plans.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No plans available. Contact support.</p>
              ) : (
                plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    current={false}
                    loading={loadingPlan === plan.id}
                    bankAccounts={bankAccounts}
                    pendingTransfer={!!pendingTransfer[`plan_${plan.id}`]}
                    onSubscribe={subscribeToPlan}
                    onTransferSubmitted={() => setPendingTransfer(p => ({ ...p, [`plan_${plan.id}`]: true }))}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Payment history ── */}
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
                    {" · "}{p.payment_method === "bank_transfer" ? "Bank transfer" : "Paystack"}
                    {p.period_end ? ` · until ${new Date(p.period_end).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                    {fmt(Number(p.amount))}
                  </p>
                  <p className="text-xs font-semibold"
                    style={{ color: PAYMENT_STATUS_COLORS[p.payment_status] ?? "#71717a" }}>
                    {PAYMENT_STATUS_LABELS[p.payment_status] ?? p.payment_status}
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

function PlanCard({
  plan, current, loading, bankAccounts, pendingTransfer, onSubscribe, onTransferSubmitted,
}: {
  plan: Plan;
  current: boolean;
  loading: boolean;
  bankAccounts: BankAccount[];
  pendingTransfer: boolean;
  onSubscribe: (id: string) => void;
  onTransferSubmitted: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border p-4"
      style={{ background: current ? "var(--bg-secondary)" : "var(--bg)", borderColor: current ? "var(--accent)" : "var(--border)" }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{plan.name}</p>
          {plan.description && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{plan.description}</p>}
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Up to {plan.max_products.toLocaleString()} products</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="font-black text-lg" style={{ color: "var(--text-primary)" }}>
              {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(plan.price_monthly)}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>/month</p>
          </div>
          {pendingTransfer ? (
            <span className="text-xs font-semibold px-3 py-2 rounded-xl" style={{ background: "#fef3c7", color: "#d97706" }}>Pending</span>
          ) : (
            <button
              onClick={() => setExpanded(v => !v)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-black transition-all disabled:opacity-60"
              style={{ background: "var(--accent)" }}
            >
              {current ? "Renew" : "Subscribe"}
            </button>
          )}
        </div>
      </div>

      {expanded && !pendingTransfer && (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <PaymentSection
            type="plan"
            planId={plan.id}
            amount={plan.price_monthly}
            bankAccounts={bankAccounts}
            canPayPaystack
            paystackLabel={current ? `Renew — ${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(plan.price_monthly)}/mo` : `Subscribe — ${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(plan.price_monthly)}/mo`}
            onPaystack={() => onSubscribe(plan.id)}
            paystackLoading={loading}
            onTransferSubmitted={() => { onTransferSubmitted(); setExpanded(false); }}
          />
        </div>
      )}
    </div>
  );
}
