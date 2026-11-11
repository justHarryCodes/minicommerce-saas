"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Store,
  Palette,
  CreditCard,
  Check,
  Loader2,
  Upload,
  ExternalLink,
  Mail,
  KeyRound,
  Sparkles,
  Download,
  AlertTriangle,
  Truck,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
  signOut,
} from "firebase/auth";
import { Modal } from "@/components/ui/Modal";
import { auth } from "@/lib/firebase-client";
import type { Store as StoreType } from "@/types";
import { Tip } from "@/components/dashboard/Tip";
import { clLogo } from "@/lib/cloudinary";
import Link from "next/link";
import { deliverySettingsOf, podSettingsOf } from "@/lib/delivery";
import { CustomerMessagesEditor, DeliveryOptionsEditor } from "@/components/dashboard/CheckoutSettings";
import { paymentSwitches } from "@/lib/duka-pay-shared";
import CustomDomainSettings from "@/components/dashboard/CustomDomainSettings";
import DukaPaySettings from "@/components/dashboard/DukaPaySettings";
import StoreHoursSettings from "@/components/dashboard/StoreHoursSettings";
import { parseHours } from "@/lib/hours";

const DELIVERY_PRESETS = [
  "Same day",
  "30–60 minutes",
  "1–2 business days",
  "2–5 business days",
  "3–7 business days",
];

interface Props {
  store: StoreType;
  /** Which automatic customer-message channels the platform has configured */
  messaging?: { sms: boolean; email: boolean; included?: boolean };
  /** Platform switch: may stores offer manual bank transfer at all? */
  allowManualTransfers?: boolean;
}

export default function SettingsClient({ store: initial, messaging = { sms: false, email: false }, allowManualTransfers = true }: Props) {
  const router = useRouter();
  const [store, setStore] = useState(() => {
    const delivery = deliverySettingsOf(initial as unknown as Record<string, unknown>);
    const pod = podSettingsOf(initial as unknown as Record<string, unknown>);
    return {
      ...initial,
      aiAssistantEnabled: initial.aiAssistantEnabled ?? initial.ai_assistant_enabled ?? false,
      ...(() => {
        const raw = initial as unknown as Record<string, unknown>;
        const sw = paymentSwitches({
          duka_pay_enabled: (raw.dukaPayEnabled ?? raw.duka_pay_enabled) as boolean | null | undefined,
          bank_transfer_enabled: (raw.bankTransferEnabled ?? raw.bank_transfer_enabled) as boolean | null | undefined,
          payment_preference: (initial.paymentPreference ?? initial.payment_preference) as string | undefined,
        });
        return { dukaPayEnabled: sw.dukaPay, bankTransferEnabled: sw.bankTransfer };
      })(),
      deliveryZones: delivery.zones,
      freeDeliveryThreshold: delivery.freeDeliveryThreshold,
      pickupEnabled: delivery.pickupEnabled,
      pickupAddress: delivery.pickupAddress ?? "",
      podEnabled: pod.enabled,
      podDepositPercent: pod.depositPercent,
      customerNotificationsEnabled:
        initial.customerNotificationsEnabled ?? initial.customer_notifications_enabled ?? true,
      openingHours: parseHours(initial.openingHours ?? initial.opening_hours),
      allowPreorders: (initial.allowPreorders ?? initial.allow_preorders) !== false,
      minimumOrder: (initial.minimumOrder ?? initial.minimum_order) != null ? Number(initial.minimumOrder ?? initial.minimum_order) : null,
      prepTimeMinutes: (initial.prepTimeMinutes ?? initial.prep_time_minutes) != null ? Number(initial.prepTimeMinutes ?? initial.prep_time_minutes) : null,
    };
  });
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const [aiAvailable, setAiAvailable] = useState({ groq: false, gemini: false });

  useEffect(() => {
    fetch("/api/ai/status")
      .then((res) => (res.ok ? res.json() : { groq: false, gemini: false }))
      .then(setAiAvailable)
      .catch(() => {});
  }, []);

  // Danger zone
  const [exporting, setExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/dashboard/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${store.slug}-export.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Couldn't export your data. Try again.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/dashboard/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Deletion failed");
      await signOut(auth).catch(() => {});
      window.location.href = "/";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Deletion failed");
      setDeleting(false);
    }
  }

  // Email change state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailForm, setEmailForm] = useState({ currentPassword: "", newEmail: "", confirmEmail: "" });
  const [emailChanging, setEmailChanging] = useState(false);

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    if (emailForm.newEmail !== emailForm.confirmEmail) {
      toast.error("New emails do not match");
      return;
    }
    if (!emailForm.newEmail.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    setEmailChanging(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) throw new Error("Not signed in");

      const credential = EmailAuthProvider.credential(currentUser.email, emailForm.currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      // The confirmation link opens /_/auth/action, then continues to sign-in
      await verifyBeforeUpdateEmail(currentUser, emailForm.newEmail, { url: `${window.location.origin}/auth/login` });

      toast.success("Verification email sent to " + emailForm.newEmail + ". Click the link to confirm your new address.");
      setShowEmailForm(false);
      setEmailForm({ currentPassword: "", newEmail: "", confirmEmail: "" });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        toast.error("Incorrect current password");
      } else if (code === "auth/email-already-in-use") {
        toast.error("That email is already in use");
      } else if (code === "auth/too-many-requests") {
        toast.error("Too many attempts. Try again later.");
      } else {
        toast.error("Email change failed. Try again.");
      }
    } finally {
      setEmailChanging(false);
    }
  }

  const change = (key: keyof StoreType, value: unknown) =>
    setStore((s) => ({ ...s, [key]: value }));

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      change("logoUrl", data.url);
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error("Logo upload failed");
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/stores/${store.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: store.name,
          description: store.description,
          logoUrl: store.logoUrl ?? store.logo_url,
          phone: store.phone,
          whatsapp: store.whatsapp,
          aiAssistantEnabled: store.aiAssistantEnabled ?? store.ai_assistant_enabled ?? false,
          bankName: store.bankName ?? store.bank_name,
          bankAccountNumber:
            store.bankAccountNumber ?? store.bank_account_number,
          bankAccountName: store.bankAccountName ?? store.bank_account_name,
          dukaPayEnabled: store.dukaPayEnabled,
          bankTransferEnabled: store.bankTransferEnabled,
          return_policy: store.return_policy ?? store.returnPolicy ?? null,
          deliveryTimeFrame: store.deliveryTimeFrame ?? store.delivery_time_frame ?? "",
          deliveryZones: store.deliveryZones,
          freeDeliveryThreshold: store.freeDeliveryThreshold,
          pickupEnabled: store.pickupEnabled,
          pickupAddress: store.pickupAddress,
          podEnabled: store.podEnabled,
          podDepositPercent: store.podDepositPercent,
          customerNotificationsEnabled: store.customerNotificationsEnabled,
          openingHours: store.openingHours,
          allowPreorders: store.allowPreorders,
          minimumOrder: store.minimumOrder,
          prepTimeMinutes: store.prepTimeMinutes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      toast.success("Settings saved!");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pt-1 lg:pt-0 xl:grid xl:grid-cols-[180px_minmax(0,1fr)] xl:items-start xl:gap-5">
      <SettingsNav />
      <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-surface-500 dark:text-surface-400">Store details, payments, delivery and your account.</p>
        <a
          href={`/store/${store.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[13px] font-semibold text-surface-500 hover:text-surface-900 dark:hover:text-white"
        >
          <ExternalLink className="w-3.5 h-3.5" /> View storefront
        </a>
      </div>
      <div className="grid grid-cols-1 items-start gap-3 2xl:grid-cols-2">
      {/* Store Info */}
      <section id="store" className="scroll-mt-28 xl:scroll-mt-16 bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-6 space-y-5 2xl:col-span-2">
        <h2 className="font-bold text-surface-900 dark:text-white flex items-center gap-2">
          <Store className="w-4 h-4" />
          Store information
        </h2>

        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
            Store logo
          </label>
          <div className="flex items-center gap-4">
            {(store.logoUrl ?? store.logo_url) ? (
              <Image
                src={clLogo(store.logoUrl ?? store.logo_url)}
                alt="Logo"
                width={64}
                height={64}
                className="w-16 h-16 rounded-xl object-contain border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-surface-200 dark:border-surface-700 flex items-center justify-center text-surface-300">
                <Store className="w-6 h-6" />
              </div>
            )}
            <input
              ref={logoRef}
              type="file"
              accept="image/*"
              onChange={uploadLogo}
              className="sr-only"
            />
            <button
              onClick={() => logoRef.current?.click()}
              disabled={logoUploading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            >
              {logoUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Upload logo
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Store name
            </label>
            <input
              value={store.name}
              onChange={(e) => change("name", e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Store URL
            </label>
            <div className="flex items-center rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
              <span className="px-3 py-3 text-sm text-surface-400 bg-surface-50 dark:bg-surface-800 border-r border-surface-200 dark:border-surface-700 shrink-0">
                /store/
              </span>
              <input
                value={store.slug}
                disabled
                className="flex-1 px-3 py-3 bg-surface-50 dark:bg-surface-800 text-surface-400 text-sm cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-surface-400 mt-1">
              Store URL cannot be changed
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Description
            </label>
            <textarea
              value={store.description ?? ""}
              onChange={(e) => change("description", e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm resize-none"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                Phone number
              </label>
              <input
                value={store.phone ?? ""}
                onChange={(e) => change("phone", e.target.value)}
                type="tel"
                className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                WhatsApp number
              </label>
              <input
                value={store.whatsapp ?? ""}
                onChange={(e) => change("whatsapp", e.target.value)}
                type="tel"
                placeholder="234801234567"
                className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm"
              />
            </div>
          </div>
        </div>
      </section>

      <div id="domain" className="scroll-mt-28 xl:scroll-mt-16 min-w-0"><CustomDomainSettings freeAddress={`${store.slug}.${(process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "dukanigeria.com").replace(/^www\./, "")}`} /></div>

      {/* Storefront Theme */}
      <section id="appearance" className="scroll-mt-28 xl:scroll-mt-16 bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-6 space-y-5 ">
        <h2 className="font-bold text-surface-900 dark:text-white flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Storefront theme
        </h2>

        <Link
          href="/dashboard/themes"
          className="flex items-center justify-between gap-3 rounded-xl border border-surface-200 dark:border-surface-700 px-4 py-3 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
        >
          <span>
            <span className="block text-sm font-semibold text-surface-900 dark:text-white">Themes &amp; design</span>
            <span className="block text-xs text-surface-500 dark:text-surface-400">
              Choose from 40+ storefront themes and customise colours, fonts, layout and light/dark mode.
            </span>
          </span>
          <ExternalLink className="w-4 h-4 text-surface-400 shrink-0" />
        </Link>

        {/* AI shopping assistant */}
        {aiAvailable.groq && (
          <div className="pt-2 border-t border-surface-100 dark:border-surface-800">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!store.aiAssistantEnabled}
                onChange={(e) => change("aiAssistantEnabled", e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded accent-amber-400"
              />
              <span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-surface-900 dark:text-white">
                  <Sparkles className="w-3.5 h-3.5" />
                  Enable AI shopping assistant
                </span>
                <span className="block text-xs text-surface-400 mt-0.5">
                  Adds a chat bubble to your storefront that answers questions about your
                  products and return policy. Pro plan only.
                </span>
              </span>
            </label>
          </div>
        )}
      </section>

      {/* Payments at checkout — three switches */}
      <section id="payments" className="scroll-mt-28 xl:scroll-mt-16 bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-6 space-y-4 2xl:col-span-2">
        <div>
          <h2 className="font-bold text-surface-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Payments at checkout
          </h2>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            Turn on the ways customers can pay. Duka Pay is recommended — payments are confirmed automatically and paid to your bank.
          </p>
        </div>

        <PaySwitch
          title="Duka Pay"
          badge="Recommended"
          description="Card, bank transfer or USSD. Confirmed instantly, paid to your bank."
          checked={store.dukaPayEnabled}
          onChange={(v) => change("dukaPayEnabled", v)}
        >
          <DukaPaySettings
            onAccount={(a) => {
              change("bankName", a.bankName);
              change("bankAccountNumber", a.accountNumber);
              change("bankAccountName", a.accountName);
            }}
          />
        </PaySwitch>

        <PaySwitch
          title="Bank transfer"
          description={
            allowManualTransfers
              ? "Customers transfer to your account, then you confirm the payment."
              : "Turned off by Duka — use Duka Pay to accept transfers that confirm automatically."
          }
          checked={allowManualTransfers && store.bankTransferEnabled}
          disabled={!allowManualTransfers}
          onChange={(v) => change("bankTransferEnabled", v)}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-300">Bank name</span>
              <input
                value={store.bankName ?? store.bank_name ?? ""}
                onChange={(e) => change("bankName", e.target.value)}
                placeholder="e.g. Access Bank"
                className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-300">Account number</span>
              <input
                value={store.bankAccountNumber ?? store.bank_account_number ?? ""}
                onChange={(e) => change("bankAccountNumber", e.target.value.replace(/\D/g, "").slice(0, 10))}
                inputMode="numeric"
                placeholder="0123456789"
                className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm font-mono"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-300">Account name</span>
              <input
                value={store.bankAccountName ?? store.bank_account_name ?? ""}
                onChange={(e) => change("bankAccountName", e.target.value)}
                placeholder="As it appears at your bank"
                className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm"
              />
            </label>
          </div>
        </PaySwitch>

        <PaySwitch
          title="Pay on delivery"
          description="Customers pay when the order arrives. Many shoppers won't prepay a store they don't know yet."
          checked={store.podEnabled}
          onChange={(v) => change("podEnabled", v)}
        >
          <p className="mb-2 text-xs font-medium text-surface-600 dark:text-surface-300">Deposit paid online first</p>
          <div className="flex flex-wrap gap-1.5">
            {[0, 10, 20, 30, 50].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => change("podDepositPercent", pct)}
                aria-pressed={store.podDepositPercent === pct}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                  store.podDepositPercent === pct
                    ? "border-accent-400 bg-accent-50 dark:bg-accent-950 text-accent-700 dark:text-accent-300"
                    : "border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800"
                }`}
              >
                {pct === 0 ? "No deposit" : `${pct}%`}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-surface-400">Deposits are taken with Duka Pay, so they need it switched on and connected.</p>
        </PaySwitch>
      </section>

      {/* Delivery */}
      <section id="delivery" className="scroll-mt-28 xl:scroll-mt-16 bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-6 space-y-5 ">
        <h2 className="font-bold text-surface-900 dark:text-white flex items-center gap-2">
          <Truck className="w-4 h-4" />
          Delivery
        </h2>
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
            Delivery time frame
          </label>
          <input
            value={store.deliveryTimeFrame ?? store.delivery_time_frame ?? ""}
            onChange={(e) => change("deliveryTimeFrame", e.target.value)}
            maxLength={60}
            placeholder="e.g. 1–3 business days"
            className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-300 dark:placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {DELIVERY_PRESETS.map((preset) => {
              const active = (store.deliveryTimeFrame ?? store.delivery_time_frame ?? "") === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => change("deliveryTimeFrame", preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    active
                      ? "border-accent-400 bg-accent-50 dark:bg-accent-950 text-accent-700 dark:text-accent-300"
                      : "border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800"
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-surface-400 mt-2">
            Shown on your product pages and at checkout so customers know when to expect their order. Leave empty to hide.
          </p>
        </div>

        <div className="pt-5 border-t border-surface-100 dark:border-surface-800">
          <DeliveryOptionsEditor
            zones={store.deliveryZones}
            freeDeliveryThreshold={store.freeDeliveryThreshold}
            pickupEnabled={store.pickupEnabled}
            pickupAddress={store.pickupAddress}
            onChange={(key, value) => setStore((s) => ({ ...s, [key]: value }) as typeof s)}
          />
        </div>
      </section>

      <div id="hours" className="scroll-mt-28 xl:scroll-mt-16 min-w-0">
      <StoreHoursSettings
        hours={store.openingHours}
        allowPreorders={store.allowPreorders}
        minimumOrder={store.minimumOrder}
        prepTimeMinutes={store.prepTimeMinutes}
        onChange={(key, value) => setStore((s) => ({ ...s, [key]: value }) as typeof s)}
      />
      </div>

      <div id="messages" className="scroll-mt-28 xl:scroll-mt-16 min-w-0">
      <CustomerMessagesEditor
        enabled={store.customerNotificationsEnabled}
        messaging={messaging}
        onChange={(key, value) => setStore((s) => ({ ...s, [key]: value }) as typeof s)}
      />
      </div>

      {/* Return & Refund Policy */}
      <section id="policies" className="scroll-mt-28 xl:scroll-mt-16 bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-6 space-y-5 ">
        <h2 className="font-bold text-surface-900 dark:text-white flex items-center gap-2">
          Return &amp; Refund Policy
        </h2>
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
            Return &amp; Refund Policy
          </label>
          <textarea
            value={store.return_policy ?? store.returnPolicy ?? ""}
            onChange={(e) => change("return_policy", e.target.value)}
            rows={5}
            placeholder="e.g. Returns accepted within 7 days of delivery. Item must be unused and in original packaging. Contact us via WhatsApp to initiate a return."
            className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-300 dark:placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm resize-none"
          />
          <p className="text-xs text-surface-400 mt-1">Shown to customers at checkout.</p>
        </div>
      </section>

      {/* Account security — email change */}
      <section id="account" className="scroll-mt-28 xl:scroll-mt-16 bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-6 space-y-5 ">
        <h2 className="font-bold text-surface-900 dark:text-white flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Account email
        </h2>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-surface-500 dark:text-surface-400">Current email</p>
            <p className="text-sm font-medium text-surface-900 dark:text-white mt-0.5">
              {auth.currentUser?.email ?? "—"}
            </p>
          </div>
          {!showEmailForm && (
            <button
              onClick={() => setShowEmailForm(true)}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            >
              <KeyRound className="w-4 h-4" />
              Change email
            </button>
          )}
        </div>

        {showEmailForm && (
          <form onSubmit={handleEmailChange} className="space-y-4 pt-2 border-t border-surface-100 dark:border-surface-800">
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Re-enter your current password to verify it&apos;s you, then enter the new email. A verification link will be sent to the new address.
            </p>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                Current password
              </label>
              <input
                type="password"
                required
                value={emailForm.currentPassword}
                onChange={(e) => setEmailForm((f) => ({ ...f, currentPassword: e.target.value }))}
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                New email address
              </label>
              <input
                type="email"
                required
                value={emailForm.newEmail}
                onChange={(e) => setEmailForm((f) => ({ ...f, newEmail: e.target.value }))}
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                Confirm new email
              </label>
              <input
                type="email"
                required
                value={emailForm.confirmEmail}
                onChange={(e) => setEmailForm((f) => ({ ...f, confirmEmail: e.target.value }))}
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={emailChanging}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-accent-400 hover:bg-accent-500 text-black transition-all disabled:opacity-60"
              >
                {emailChanging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Send verification
              </button>
              <button
                type="button"
                onClick={() => { setShowEmailForm(false); setEmailForm({ currentPassword: "", newEmail: "", confirmEmail: "" }); }}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Save bar — stays in reach while scrolling */}
      <div className="sticky bottom-[4.5rem] z-10 lg:bottom-3 2xl:col-span-2">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-surface-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur dark:border-surface-700 dark:bg-surface-900/95">
        <p className="text-[12px] text-surface-500 dark:text-surface-400">Store info, payments, delivery and policy changes go live when you save.</p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex shrink-0 items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm bg-accent-400 hover:bg-accent-500 text-black transition-all disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Save settings
        </button>
        </div>
      </div>

      {/* Danger zone */}
      <section id="danger" className="scroll-mt-28 xl:scroll-mt-16 bg-white dark:bg-surface-900 rounded-2xl border border-red-200 dark:border-red-900/50 p-6 space-y-5 2xl:col-span-2">
        <h2 className="font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Danger zone
        </h2>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-surface-900 dark:text-white">Export my data</p>
            <p className="text-xs text-surface-400 mt-0.5">
              Download everything in your store — products, categories, orders, coupons, reels, reviews — as JSON.
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors disabled:opacity-60"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 pt-4 border-t border-surface-100 dark:border-surface-800">
          <div>
            <p className="text-sm font-medium text-surface-900 dark:text-white">Delete my account</p>
            <p className="text-xs text-surface-400 mt-0.5">
              Permanently deactivates your store and removes your personal info and bank details.
              Order history is kept for accounting and can&apos;t be undone.
            </p>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 dark:border-red-900 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            Delete account
          </button>
        </div>
      </section>
      </div>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setConfirmName(""); }}
        title="Delete your account"
      >
        <div className="space-y-4">
          <p className="text-sm text-surface-600 dark:text-surface-400">
            This deactivates <strong>{store.name}</strong>, wipes your logo, contact info, and bank
            details, and signs you out for good. Your order history stays intact for accounting —
            everything else is gone. This can&apos;t be undone.
          </p>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Type <span className="font-mono font-bold">{store.name}</span> to confirm
            </label>
            <input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleDeleteAccount}
              disabled={deleting || confirmName !== store.name}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-40"
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              {deleting ? "Deleting…" : "Permanently delete"}
            </button>
            <button
              onClick={() => { setShowDeleteModal(false); setConfirmName(""); }}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const SETTINGS_SECTIONS: { id: string; label: string }[] = [
  { id: "store", label: "Store info" },
  { id: "domain", label: "Domain" },
  { id: "appearance", label: "Appearance" },
  { id: "payments", label: "Payments" },
  { id: "delivery", label: "Delivery" },
  { id: "hours", label: "Opening hours" },
  { id: "messages", label: "Customer messages" },
  { id: "policies", label: "Returns policy" },
  { id: "account", label: "Account" },
  { id: "danger", label: "Danger zone" },
];

/** Jump list: a sticky column on desktop, a scrolling chip row on smaller screens. */
function SettingsNav() {
  const [active, setActive] = useState("store");
  useEffect(() => {
    const els = SETTINGS_SECTIONS.map((x) => document.getElementById(x.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  const go = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <nav aria-label="Settings sections" className="sticky top-12 z-20 -mx-3 mb-3 border-b border-surface-100 bg-zinc-50/95 px-3 py-2 backdrop-blur dark:border-surface-800 dark:bg-zinc-950/95 sm:-mx-4 sm:px-4 lg:top-12 xl:top-16 xl:mx-0 xl:mb-0 xl:border-0 xl:bg-transparent xl:p-0 xl:backdrop-blur-none">
      <ul className="no-scrollbar flex gap-1 overflow-x-auto xl:flex-col xl:overflow-visible">
        {SETTINGS_SECTIONS.map((x) => (
          <li key={x.id} className="shrink-0">
            <button
              type="button"
              onClick={() => go(x.id)}
              aria-current={active === x.id ? "true" : undefined}
              className={`w-full rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors ${
                active === x.id
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : x.id === "danger"
                    ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    : "text-surface-600 hover:bg-zinc-100 dark:text-surface-300 dark:hover:bg-zinc-800"
              }`}
            >
              {x.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** One payment method: a switch, and its settings underneath when on. */
function PaySwitch({
  title,
  badge,
  description,
  checked,
  disabled,
  onChange,
  children,
}: {
  title: string;
  badge?: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border transition-colors ${checked ? "border-accent-300 dark:border-accent-800" : "border-surface-200 dark:border-surface-700"} ${disabled ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3 p-3.5">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-white">
            {title}
            {badge && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">{badge}</span>}
          </p>
          <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">{description}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={title}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed ${checked ? "bg-accent-400" : "bg-surface-200 dark:bg-surface-700"}`}
        >
          <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
        </button>
      </div>
      {checked && children && <div className="border-t border-surface-100 p-3.5 dark:border-surface-800">{children}</div>}
    </div>
  );
}
