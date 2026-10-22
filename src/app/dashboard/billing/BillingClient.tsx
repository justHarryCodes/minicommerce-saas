"use client";

import { useEffect, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  Check,
  Clock,
  Copy,
  CreditCard,
  Hourglass,
  Info,
  Loader2,
  Lock,
  Receipt,
} from "lucide-react";
import type { PlatformSettings } from "@/lib/admin-auth";
import { InfoTip } from "@/components/dashboard/Tip";

// ── Types ──────────────────────────────────────────────────────────────────
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
  max_reels: number;
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

type PayType = "setup_fee" | "monthly" | "plan";
type PayMethod = "paystack" | "transfer";
type StepState = "done" | "current" | "review" | "locked";

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  active: { color: "#16a34a", label: "Active" },
  suspended: { color: "#dc2626", label: "Suspended" },
  restricted: { color: "#ea580c", label: "Restricted" },
  pending_payment: { color: "#d97706", label: "Payment pending" },
  pending_approval: { color: "#2563eb", label: "Awaiting approval" },
};

const PAYMENT_STATUS: Record<string, { color: string; label: string }> = {
  paid: { color: "#16a34a", label: "Paid" },
  pending: { color: "#d97706", label: "Pending" },
  pending_transfer: { color: "#d97706", label: "Awaiting confirmation" },
  failed: { color: "#dc2626", label: "Failed" },
  rejected: { color: "#dc2626", label: "Rejected" },
};

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  setup_fee: "Registration fee",
  monthly: "Monthly subscription",
  plan: "Product plan",
};

// ── Small pieces ───────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const { color, label } = STATUS_MAP[status] ?? {
    color: "#71717a",
    label: status,
  };
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold"
      style={{ color, background: `${color}14` }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the number and copy it manually.");
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy account number"
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
      style={{ color: copied ? "#16a34a" : "var(--text-secondary)" }}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function Overview({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="p-5" style={{ background: "var(--bg)" }}>
      <p
        className="mb-2 text-xs font-medium"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

// ── Bank transfer ──────────────────────────────────────────────────────────
function BankTransferPanel({
  type,
  planId,
  amount,
  bankAccounts,
  onSubmitted,
}: {
  type: PayType;
  planId?: string;
  amount: number;
  bankAccounts: BankAccount[];
  onSubmitted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  // Stable for the lifetime of this panel so the reference doesn't change on re-render
  const [reference] = useState(
    () =>
      `${type.replace(/_/g, "-").toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-6)}`,
  );

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
      toast.success(
        "Transfer recorded. An admin will confirm within 24 hours.",
      );
      onSubmitted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div
        className="flex items-center gap-2 text-sm font-semibold"
        style={{ color: "#d97706" }}
      >
        <Clock className="h-4 w-4" />
        Transfer recorded. Awaiting admin confirmation.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bankAccounts.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No bank accounts are set up yet. Contact support to pay by transfer.
        </p>
      ) : (
        <div
          className="divide-y overflow-hidden rounded-xl border"
          style={{ borderColor: "var(--border)" }}
        >
          {bankAccounts.map((acct) => (
            <div
              key={acct.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
              style={{
                background: "var(--bg-secondary, #f9fafb)",
                borderColor: "var(--border)",
              }}
            >
              <div className="min-w-0">
                <p
                  className="text-xs font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  {acct.bank_name}
                </p>
                <p
                  className="font-mono text-lg font-bold tabular-nums tracking-wide"
                  style={{ color: "var(--text-primary)" }}
                >
                  {acct.account_number}
                </p>
                <p
                  className="truncate text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {acct.account_name}
                </p>
              </div>
              <CopyButton text={acct.account_number} />
            </div>
          ))}
        </div>
      )}

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs" style={{ color: "var(--text-muted)" }}>
            Amount to transfer
          </dt>
          <dd
            className="font-bold tabular-nums"
            style={{ color: "var(--text-primary)" }}
          >
            {fmt(amount)}
          </dd>
        </div>
        <div>
          <dt className="text-xs" style={{ color: "var(--text-muted)" }}>
            Your reference
          </dt>
          <dd
            className="font-mono font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {reference}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || bankAccounts.length === 0}
        className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: "#16a34a", color: "#fff" }}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
        {loading ? "Submitting…" : "I've made this transfer"}
      </button>
    </div>
  );
}

// ── Payment method switcher ────────────────────────────────────────────────
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
  type: PayType;
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

  const tabs: { key: PayMethod; icon: ReactNode; label: string }[] = [
    {
      key: "paystack",
      icon: <CreditCard className="h-3.5 w-3.5" />,
      label: "Card or online",
    },
    {
      key: "transfer",
      icon: <Building2 className="h-3.5 w-3.5" />,
      label: "Bank transfer",
    },
  ];

  return (
    <div>
      <div
        role="tablist"
        className="mb-4 inline-flex gap-1 rounded-xl p-1"
        style={{ background: "var(--bg-secondary, #f3f4f6)" }}
      >
        {tabs.map(({ key, icon, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={method === key}
            onClick={() => setMethod(key)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all"
            style={{
              background: method === key ? "var(--bg, #fff)" : "transparent",
              color:
                method === key ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: method === key ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {method === "paystack" ? (
        <button
          type="button"
          onClick={onPaystack}
          disabled={paystackLoading || !canPayPaystack}
          className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--accent)" }}
        >
          {paystackLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
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

// ── Stepper row ────────────────────────────────────────────────────────────
function Step({
  no,
  state,
  isLast,
  title,
  chip,
  description,
  price,
  priceNote,
  action,
  children,
}: {
  no: number;
  state: StepState;
  isLast: boolean;
  title: ReactNode;
  chip?: string;
  description?: string;
  price?: string;
  priceNote?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  const marker: Record<
    StepState,
    { bg: string; color: string; border: string; icon: ReactNode }
  > = {
    done: {
      bg: "#16a34a14",
      color: "#16a34a",
      border: "#16a34a40",
      icon: <Check className="h-4 w-4" />,
    },
    current: {
      bg: "var(--accent)",
      color: "#000",
      border: "var(--accent)",
      icon: <span className="text-xs font-black">{no}</span>,
    },
    review: {
      bg: "#d9770614",
      color: "#d97706",
      border: "#d9770640",
      icon: <Clock className="h-4 w-4" />,
    },
    locked: {
      bg: "transparent",
      color: "var(--text-muted)",
      border: "var(--border)",
      icon: <Lock className="h-3.5 w-3.5" />,
    },
  };
  const m = marker[state];

  return (
    <li className="flex gap-4">
      <div className="flex flex-col items-center">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
          style={{ background: m.bg, color: m.color, borderColor: m.border }}
        >
          {m.icon}
        </span>
        {!isLast && (
          <span
            className="mt-2 w-px flex-1"
            style={{ background: "var(--border)" }}
          />
        )}
      </div>

      <div
        className={`min-w-0 flex-1 ${isLast ? "" : "pb-8"}`}
        style={{ opacity: state === "locked" ? 0.6 : 1 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                className="text-base font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {title}
              </h2>
              {chip && (
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{
                    background:
                      state === "done"
                        ? "#16a34a14"
                        : state === "review"
                          ? "#d9770614"
                          : "var(--bg-secondary, #f3f4f6)",
                    color:
                      state === "done"
                        ? "#16a34a"
                        : state === "review"
                          ? "#b45309"
                          : "var(--text-secondary)",
                  }}
                >
                  {chip}
                </span>
              )}
            </div>
            {description && (
              <p
                className="mt-1 max-w-prose text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {price && (
              <div className="text-right">
                <p
                  className="text-xl font-black tabular-nums"
                  style={{ color: "var(--text-primary)" }}
                >
                  {price}
                </p>
                {priceNote && (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {priceNote}
                  </p>
                )}
              </div>
            )}
            {action}
          </div>
        </div>

        {children && (
          <div
            className="mt-4 rounded-2xl border p-5"
            style={{ background: "var(--bg)", borderColor: "var(--border)" }}
          >
            {children}
          </div>
        )}
      </div>
    </li>
  );
}

function GhostButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
      style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
    >
      {children}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function BillingClient({
  store,
  settings,
  payments,
  plans,
  bankAccounts,
  currentPlan,
  success,
  error,
}: Props) {
  const [loadingSetupFee, setLoadingSetupFee] = useState(false);
  const [loadingSubscribe, setLoadingSubscribe] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [pendingTransfer, setPendingTransfer] = useState<
    Record<string, boolean>
  >({});

  // ── Derived billing state ──────────────────────────────────────────────────
  const now = new Date();

  const setupPaid =
    store.subscriptionStatus === "setup_fee_paid" ||
    store.subscriptionStatus === "subscribed" ||
    store.subscriptionStatus === "expired";

  const expiresAt = store.subscriptionExpiresAt
    ? new Date(store.subscriptionExpiresAt)
    : null;
  const isExpired = expiresAt ? expiresAt < now : false;
  const isSubscribed = store.subscriptionStatus === "subscribed" && !isExpired;

  const planExpiresAt = store.planExpiresAt
    ? new Date(store.planExpiresAt)
    : null;
  const isPlanActive = planExpiresAt ? planExpiresAt > now : false;

  const isRenewalWindow = now.getDate() >= 25;
  const daysUntilExpiry = expiresAt
    ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const expiringVerySoon =
    daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  const needsRenewal = isRenewalWindow || expiringVerySoon;
  const daysLeft = daysUntilExpiry === null ? 0 : Math.max(daysUntilExpiry, 0);
  const cyclePct = Math.min(100, Math.round((daysLeft / 30) * 100));

  const [monthlyOpen, setMonthlyOpen] = useState(!isSubscribed || needsRenewal);
  const [plansOpen, setPlansOpen] = useState(!isPlanActive);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  useEffect(() => {
    if (success === "paid")
      toast.success("Payment confirmed! Your store is being updated.");
    if (success === "already_paid")
      toast.success("This payment was already processed.");
    if (error === "payment_failed")
      toast.error("Payment failed. Please try again.");
    if (error === "invalid_params") toast.error("Invalid payment reference.");
    if (
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("pending") === "1"
    ) {
      toast(
        "Your payment is still being confirmed by Paystack. This page will update once it completes.",
        { icon: "⏳" },
      );
    }
  }, [success, error]);

  useEffect(() => {
    const pending: Record<string, boolean> = {};
    for (const p of payments) {
      if (p.payment_status === "pending_transfer") pending[p.type] = true;
    }
    setPendingTransfer(pending);
  }, [payments]);

  // ── Actions ────────────────────────────────────────────────────────────────
  async function startCheckout(
    url: string,
    setLoading: (v: boolean) => void,
    body?: Record<string, unknown>,
  ) {
    setLoading(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        ...(body
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          : {}),
      });
      const data = await res.json();
      if (data.alreadyPaid) {
        toast.success("This payment was already completed.");
        window.location.reload();
      } else if (data.authorization_url) {
        window.location.href = data.authorization_url;
        return; // keep the loading state while redirecting
      } else {
        toast.error(data.error ?? "Failed to initiate payment");
      }
    } catch {
      toast.error("Network error");
    }
    setLoading(false);
  }

  const paySetupFee = () =>
    startCheckout("/api/billing/setup-fee", setLoadingSetupFee);
  const subscribe = () =>
    startCheckout("/api/billing/subscribe", setLoadingSubscribe);
  const subscribeToPlan = (planId: string) =>
    startCheckout(
      "/api/billing/subscribe-plan",
      (v) => setLoadingPlan(v ? planId : null),
      { plan_id: planId },
    );

  // ── Step visibility & state ────────────────────────────────────────────────
  const showSetup = settings.require_setup_fee;
  const showMonthly = settings.require_subscription;
  const showPlan = settings.require_plan_subscription;

  const setupNo = 1;
  const monthlyNo = (showSetup ? 1 : 0) + 1;
  const planNo = (showSetup ? 1 : 0) + (showMonthly ? 1 : 0) + 1;
  const lastStep = showPlan ? "plan" : showMonthly ? "monthly" : "setup";

  const setupState: StepState = setupPaid
    ? "done"
    : pendingTransfer.setup_fee || store.status === "pending_approval"
      ? "review"
      : "current";

  const monthlyUnlocked = !showSetup || setupPaid;
  const monthlyState: StepState = !monthlyUnlocked
    ? "locked"
    : pendingTransfer.monthly
      ? "review"
      : isSubscribed && !monthlyOpen
        ? "done"
        : isSubscribed
          ? "current"
          : "current";

  const planState: StepState = pendingTransfer.plan
    ? "review"
    : isPlanActive && !plansOpen
      ? "done"
      : "current";

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  const hasActivePlan =
    isPlanActive && !!currentPlan && currentPlan.price_monthly > 0;

  return (
    <div className="max-w-5xl">
      {/* ── Header ── */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="text-2xl font-black"
            style={{ color: "var(--text-primary)" }}
          >
            Billing
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Payments and subscription for {store.name}
          </p>
        </div>
        <StatusPill status={store.status} />
      </header>

      {/* ── Overview band ── */}
      <section
        aria-label="Billing overview"
        className="mb-6 grid gap-px overflow-hidden rounded-2xl border"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          background: "var(--border)",
          borderColor: "var(--border)",
        }}
      >
        <Overview label="Registration">
          {showSetup ? (
            setupPaid ? (
              <>
                <p
                  className="flex items-center gap-1.5 text-base font-bold"
                  style={{ color: "#16a34a" }}
                >
                  <BadgeCheck className="h-4 w-4" /> Paid
                </p>
                {store.setupFeePaidAt && (
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    on {fmtDate(store.setupFeePaidAt)}
                  </p>
                )}
              </>
            ) : (
              <>
                <p
                  className="text-base font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {setupState === "review" ? "Under review" : "Not paid"}
                </p>
                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {fmt(settings.setup_fee_amount)} one-time fee
                </p>
              </>
            )
          ) : (
            <p
              className="text-base font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Not required
            </p>
          )}
        </Overview>

        {showMonthly && (
          <Overview label="Subscription">
            {expiresAt ? (
              <>
                <p
                  className="text-base font-bold"
                  style={{
                    color: isExpired ? "#dc2626" : "var(--text-primary)",
                  }}
                >
                  {isExpired ? "Expired" : "Active"}
                </p>
                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {isExpired ? "Ended" : "Renews by"} {fmtDate(expiresAt)}
                </p>
                {!isExpired && (
                  <div className="mt-3">
                    <div
                      className="h-1.5 overflow-hidden rounded-full"
                      style={{ background: "var(--bg-secondary, #f3f4f6)" }}
                      role="progressbar"
                      aria-valuenow={daysLeft}
                      aria-valuemin={0}
                      aria-valuemax={30}
                      aria-label="Days left in billing period"
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${cyclePct}%`,
                          background: expiringVerySoon ? "#d97706" : "#16a34a",
                        }}
                      />
                    </div>
                    <p
                      className="mt-1.5 text-xs font-medium"
                      style={{
                        color: expiringVerySoon
                          ? "#b45309"
                          : "var(--text-secondary)",
                      }}
                    >
                      {daysLeft} day{daysLeft === 1 ? "" : "s"} left
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <p
                  className="text-base font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Not subscribed
                </p>
                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {fmt(settings.monthly_fee_amount)} per month
                </p>
              </>
            )}
          </Overview>
        )}

        {showPlan && (
          <Overview label="Product plan">
            {hasActivePlan && currentPlan ? (
              <>
                <p
                  className="text-base font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {currentPlan.name}
                </p>
                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  until {planExpiresAt ? fmtDate(planExpiresAt) : "-"}
                </p>
                <p
                  className="mt-3 text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {currentPlan.max_products.toLocaleString()} products,{" "}
                  {currentPlan.max_reels.toLocaleString()} reels a month
                </p>
              </>
            ) : (
              <>
                <p
                  className="text-base font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  No active plan
                </p>
                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  Choose a plan to list products
                </p>
              </>
            )}
          </Overview>
        )}
      </section>

      {/* ── Alerts ── */}
      {(store.status === "pending_approval" || isExpired) && (
        <div className="mb-6 space-y-3">
          {store.status === "pending_approval" && (
            <div
              role="status"
              className="flex gap-3 rounded-xl border px-4 py-3"
              style={{ background: "#2563eb10", borderColor: "#2563eb30" }}
            >
              <Hourglass
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: "#2563eb" }}
              />
              <p className="text-sm" style={{ color: "#1d4ed8" }}>
                <strong>Your payment is being reviewed.</strong> An admin will
                confirm within 24 hours and your store will go live.
              </p>
            </div>
          )}
          {isExpired && expiresAt && (
            <div
              role="alert"
              className="flex gap-3 rounded-xl border px-4 py-3"
              style={{ background: "#dc262610", borderColor: "#dc262630" }}
            >
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: "#dc2626" }}
              />
              <p className="text-sm" style={{ color: "#b91c1c" }}>
                <strong>
                  Your subscription expired on {fmtDate(expiresAt)}.
                </strong>{" "}
                Renew below to restore your store.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Two-column body ── */}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Steps */}
        <section aria-label="Payments">
          {!showSetup && !showMonthly && !showPlan ? (
            <div
              className="rounded-2xl border p-6 text-sm"
              style={{
                background: "var(--bg)",
                borderColor: "var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              Nothing to pay right now. Your store has no active billing
              requirements.
            </div>
          ) : (
            <ol className="list-none p-0">
              {/* Registration fee */}
              {showSetup && (
                <Step
                  no={setupNo}
                  state={setupState}
                  isLast={lastStep === "setup"}
                  title="Registration fee"
                  chip={
                    setupState === "done"
                      ? "Paid"
                      : setupState === "review"
                        ? "In review"
                        : undefined
                  }
                  description={
                    setupPaid
                      ? "Your store registration is complete."
                      : `Pay once to submit your store for verification. Valid for ${settings.setup_fee_duration_months} month${settings.setup_fee_duration_months !== 1 ? "s" : ""}.`
                  }
                  price={setupPaid ? undefined : fmt(settings.setup_fee_amount)}
                  priceNote={setupPaid ? undefined : "one-time"}
                >
                  {setupState === "current" ? (
                    <PaymentSection
                      type="setup_fee"
                      amount={settings.setup_fee_amount}
                      bankAccounts={bankAccounts}
                      canPayPaystack
                      paystackLabel={`Pay ${fmt(settings.setup_fee_amount)}`}
                      onPaystack={paySetupFee}
                      paystackLoading={loadingSetupFee}
                      onTransferSubmitted={() =>
                        setPendingTransfer((p) => ({ ...p, setup_fee: true }))
                      }
                    />
                  ) : setupState === "review" ? (
                    <p
                      className="flex items-center gap-2 text-sm font-semibold"
                      style={{ color: "#d97706" }}
                    >
                      <Hourglass className="h-4 w-4" />
                      Payment submitted. Awaiting admin confirmation.
                    </p>
                  ) : null}
                </Step>
              )}

              {/* Monthly subscription */}
              {showMonthly && (
                <Step
                  no={monthlyNo}
                  state={monthlyState}
                  isLast={lastStep === "monthly"}
                  title="Monthly subscription"
                  chip={
                    monthlyState === "locked"
                      ? "Pay registration first"
                      : monthlyState === "review"
                        ? "In review"
                        : isExpired
                          ? "Expired"
                          : isSubscribed && needsRenewal
                            ? "Renew now"
                            : isSubscribed
                              ? "Active"
                              : undefined
                  }
                  description={
                    monthlyState === "locked"
                      ? "Unlocks once your registration fee is paid."
                      : isExpired && expiresAt
                        ? `Expired ${fmtDate(expiresAt)}. Renew to restore your store.`
                        : isSubscribed && expiresAt
                          ? needsRenewal
                            ? `Expires ${fmtDate(expiresAt)}. Renewing adds 30 days to your current expiry date.`
                            : `Active until ${fmtDate(expiresAt)}.`
                          : "Keeps your store live. Billed every 30 days."
                  }
                  price={
                    monthlyState === "locked"
                      ? undefined
                      : fmt(settings.monthly_fee_amount)
                  }
                  priceNote={
                    monthlyState === "locked" ? undefined : "per 30 days"
                  }
                  action={
                    monthlyState === "done" ? (
                      <GhostButton onClick={() => setMonthlyOpen(true)}>
                        Renew early
                      </GhostButton>
                    ) : undefined
                  }
                >
                  {monthlyState === "current" ? (
                    <PaymentSection
                      type="monthly"
                      amount={settings.monthly_fee_amount}
                      bankAccounts={bankAccounts}
                      canPayPaystack
                      paystackLabel={
                        isExpired || isSubscribed
                          ? `Renew for ${fmt(settings.monthly_fee_amount)}`
                          : `Subscribe for ${fmt(settings.monthly_fee_amount)}`
                      }
                      onPaystack={subscribe}
                      paystackLoading={loadingSubscribe}
                      onTransferSubmitted={() =>
                        setPendingTransfer((p) => ({ ...p, monthly: true }))
                      }
                    />
                  ) : monthlyState === "review" ? (
                    <p
                      className="flex items-center gap-2 text-sm font-semibold"
                      style={{ color: "#d97706" }}
                    >
                      <Clock className="h-4 w-4" />
                      Transfer submitted. Awaiting admin confirmation.
                    </p>
                  ) : null}
                </Step>
              )}

              {/* Product plan */}
              {showPlan && (
                <Step
                  no={planNo}
                  state={planState}
                  isLast
                  title={
                    <span className="inline-flex items-center gap-2">
                      Product plan
                      <InfoTip content="A plan controls how many products you can list. Without an active plan you won't be able to add products." />
                    </span>
                  }
                  chip={
                    planState === "review"
                      ? "In review"
                      : hasActivePlan && currentPlan
                        ? `${currentPlan.name} active`
                        : undefined
                  }
                  description={
                    hasActivePlan && planExpiresAt
                      ? `Active until ${fmtDate(planExpiresAt)}. Renew before then to keep listing products.`
                      : "Pick a plan to list products on your store."
                  }
                  action={
                    planState === "done" ? (
                      <GhostButton onClick={() => setPlansOpen(true)}>
                        Renew or switch
                      </GhostButton>
                    ) : undefined
                  }
                >
                  {planState === "review" ? (
                    <p
                      className="flex items-center gap-2 text-sm font-semibold"
                      style={{ color: "#d97706" }}
                    >
                      <Clock className="h-4 w-4" />
                      Transfer submitted. Awaiting admin confirmation.
                    </p>
                  ) : planState === "current" ? (
                    plans.length === 0 ? (
                      <p
                        className="text-sm"
                        style={{ color: "var(--text-muted)" }}
                      >
                        No plans are available yet. Contact support.
                      </p>
                    ) : (
                      <div className="space-y-5">
                        <div
                          role="radiogroup"
                          aria-label="Choose a plan"
                          className="grid gap-3 sm:grid-cols-2"
                        >
                          {plans.map((plan) => {
                            const selected = plan.id === selectedPlanId;
                            const isCurrent = plan.id === store.currentPlanId;
                            return (
                              <button
                                key={plan.id}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => setSelectedPlanId(plan.id)}
                                className="rounded-xl border p-4 text-left transition-colors"
                                style={{
                                  background: selected
                                    ? "var(--bg-secondary, #f9fafb)"
                                    : "var(--bg)",
                                  borderColor: selected
                                    ? "var(--accent)"
                                    : "var(--border)",
                                  boxShadow: selected
                                    ? "0 0 0 1px var(--accent)"
                                    : "none",
                                }}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p
                                    className="text-sm font-bold"
                                    style={{ color: "var(--text-primary)" }}
                                  >
                                    {plan.name}
                                  </p>
                                  {isCurrent && (
                                    <span
                                      className="rounded-full px-2 py-0.5 text-xs font-semibold"
                                      style={{
                                        background: "#16a34a14",
                                        color: "#16a34a",
                                      }}
                                    >
                                      Current
                                    </span>
                                  )}
                                </div>
                                <p
                                  className="mt-1 text-xl font-black tabular-nums"
                                  style={{ color: "var(--text-primary)" }}
                                >
                                  {fmt(plan.price_monthly)}
                                  <span
                                    className="text-xs font-medium"
                                    style={{ color: "var(--text-muted)" }}
                                  >
                                    {" "}
                                    /month
                                  </span>
                                </p>
                                {plan.description && (
                                  <p
                                    className="mt-2 text-xs leading-relaxed"
                                    style={{ color: "var(--text-muted)" }}
                                  >
                                    {plan.description}
                                  </p>
                                )}
                                <ul
                                  className="mt-3 space-y-1 text-xs"
                                  style={{ color: "var(--text-secondary)" }}
                                >
                                  <li className="flex items-center gap-1.5">
                                    <Check
                                      className="h-3 w-3"
                                      style={{ color: "#16a34a" }}
                                    />
                                    Up to {plan.max_products.toLocaleString()}{" "}
                                    products
                                  </li>
                                  <li className="flex items-center gap-1.5">
                                    <Check
                                      className="h-3 w-3"
                                      style={{ color: "#16a34a" }}
                                    />
                                    {plan.max_reels.toLocaleString()} reels a
                                    month
                                  </li>
                                </ul>
                              </button>
                            );
                          })}
                        </div>

                        {selectedPlan ? (
                          <div
                            className="border-t pt-5"
                            style={{ borderColor: "var(--border)" }}
                          >
                            <p
                              className="mb-3 text-sm font-semibold"
                              style={{ color: "var(--text-primary)" }}
                            >
                              Pay for {selectedPlan.name}
                            </p>
                            <PaymentSection
                              key={selectedPlan.id}
                              type="plan"
                              planId={selectedPlan.id}
                              amount={selectedPlan.price_monthly}
                              bankAccounts={bankAccounts}
                              canPayPaystack
                              paystackLabel={
                                selectedPlan.id === store.currentPlanId
                                  ? `Renew for ${fmt(selectedPlan.price_monthly)}`
                                  : `Subscribe for ${fmt(selectedPlan.price_monthly)}`
                              }
                              onPaystack={() =>
                                subscribeToPlan(selectedPlan.id)
                              }
                              paystackLoading={loadingPlan === selectedPlan.id}
                              onTransferSubmitted={() =>
                                setPendingTransfer((p) => ({
                                  ...p,
                                  plan: true,
                                }))
                              }
                            />
                          </div>
                        ) : (
                          <p
                            className="flex items-center gap-1.5 text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            <Info className="h-3.5 w-3.5" /> Select a plan to
                            see payment options.
                          </p>
                        )}
                      </div>
                    )
                  ) : null}
                </Step>
              )}
            </ol>
          )}
        </section>

        {/* Payment history */}
        <aside
          aria-label="Payment history"
          className="overflow-hidden rounded-2xl border lg:sticky lg:top-6"
          style={{ background: "var(--bg)", borderColor: "var(--border)" }}
        >
          <div
            className="flex items-center gap-2 border-b px-5 py-4"
            style={{ borderColor: "var(--border)" }}
          >
            <Receipt
              className="h-4 w-4"
              style={{ color: "var(--text-muted)" }}
            />
            <h2
              className="text-sm font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Payment history
            </h2>
          </div>

          {payments.length === 0 ? (
            <p
              className="px-5 py-8 text-center text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              No payments yet. Your receipts will appear here.
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
              {payments.map((p) => {
                const s = PAYMENT_STATUS[p.payment_status] ?? {
                  color: "#71717a",
                  label: p.payment_status,
                };
                return (
                  <li
                    key={p.id}
                    className="px-5 py-3.5"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {PAYMENT_TYPE_LABEL[p.type] ??
                            p.type.replace(/_/g, " ")}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {fmtDate(p.created_at)}
                        </p>
                      </div>
                      <p
                        className="text-sm font-bold tabular-nums"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {fmt(Number(p.amount))}
                      </p>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-3 text-xs">
                      <span
                        className="inline-flex items-center gap-1.5 font-semibold"
                        style={{ color: s.color }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: s.color }}
                        />
                        {s.label}
                      </span>
                      <span style={{ color: "var(--text-muted)" }}>
                        {p.payment_method === "bank_transfer"
                          ? "Bank transfer"
                          : "Paystack"}
                        {p.period_end ? `, to ${fmtDate(p.period_end)}` : ""}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
