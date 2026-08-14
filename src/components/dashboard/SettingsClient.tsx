"use client";

import { useState, useRef, useEffect } from "react";
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
import { THEME_PRESETS } from "@/lib/theme-presets";

interface Props {
  store: StoreType;
}

const ACCENT_PRESETS = [
  { label: "Yellow", value: "#f59e0b" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Emerald", value: "#10b981" },
  { label: "Sky", value: "#0ea5e9" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Orange", value: "#f97316" },
  { label: "Teal", value: "#14b8a6" },
];

export default function SettingsClient({ store: initial }: Props) {
  const router = useRouter();
  const [store, setStore] = useState(() => ({
    ...initial,
    // Normalize theme fields so the selectors always have a concrete value to compare against
    storefrontThemeMode:
      initial.storefrontThemeMode ?? initial.themeMode ?? initial.theme_mode ?? "both",
    storefrontAccentColor:
      initial.storefrontAccentColor ?? initial.accentColor ?? initial.accent_color ?? "#f59e0b",
    storefrontFont: initial.storefrontFont ?? initial.storefront_font ?? "inter",
    storefrontCardStyle: initial.storefrontCardStyle ?? initial.storefront_card_style ?? "rounded",
    aiAssistantEnabled: initial.aiAssistantEnabled ?? initial.ai_assistant_enabled ?? false,
    paymentPreference:
      initial.paymentPreference ?? initial.payment_preference ?? "paystack",
  }));
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
      await verifyBeforeUpdateEmail(currentUser, emailForm.newEmail);

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
          storefrontThemeMode:
            store.storefrontThemeMode ?? store.themeMode ?? store.theme_mode,
          storefrontAccentColor:
            store.storefrontAccentColor ??
            store.accentColor ??
            store.accent_color,
          storefrontFont: store.storefrontFont ?? store.storefront_font,
          storefrontCardStyle: store.storefrontCardStyle ?? store.storefront_card_style,
          aiAssistantEnabled: store.aiAssistantEnabled ?? store.ai_assistant_enabled ?? false,
          bankName: store.bankName ?? store.bank_name,
          bankAccountNumber:
            store.bankAccountNumber ?? store.bank_account_number,
          bankAccountName: store.bankAccountName ?? store.bank_account_name,
          paymentPreference:
            store.paymentPreference ?? store.payment_preference,
          paystackPublicKey:
            store.paystackPublicKey ?? store.paystack_public_key,
          return_policy: store.return_policy ?? store.returnPolicy ?? null,
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
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-surface-900 dark:text-white">
            Settings
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            Manage your store details and storefront appearance
          </p>
        </div>
        <a
          href={`/store/${store.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-900 dark:hover:text-white transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          View storefront
        </a>
      </div>

      <Tip id="settings-guide" variant="tip">
        <strong>Tips:</strong> Add a WhatsApp number to get an order button in your cart. Set your bank details so customers know how to pay. Pick an accent colour that matches your brand — it highlights buttons and links on your storefront.
      </Tip>

      {/* Store Info */}
      <section className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-6 space-y-5">
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
              <img
                src={clLogo(store.logoUrl ?? store.logo_url)}
                alt="Logo"
                loading="lazy"
                decoding="async"
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

      {/* Storefront Theme */}
      <section className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-6 space-y-5">
        <h2 className="font-bold text-surface-900 dark:text-white flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Storefront theme
        </h2>

        {/* Theme presets */}
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">
            Theme presets
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {THEME_PRESETS.map((preset) => {
              const active =
                store.storefrontAccentColor === preset.accentColor &&
                store.storefrontFont === preset.font &&
                store.storefrontCardStyle === preset.cardStyle;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    change("storefrontAccentColor", preset.accentColor);
                    change("storefrontFont", preset.font);
                    change("storefrontCardStyle", preset.cardStyle);
                  }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                    active
                      ? "border-surface-900 dark:border-white"
                      : "border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600"
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full shrink-0"
                    style={{ backgroundColor: preset.accentColor }}
                  />
                  <span className="text-xs font-semibold text-surface-700 dark:text-surface-300">
                    {preset.label}
                  </span>
                  {active && <Check className="w-3.5 h-3.5 ml-auto text-surface-900 dark:text-white" />}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-surface-400 mt-2">
            Sets accent color, font, and card style together — fine-tune any of them individually below.
          </p>
        </div>

        {/* Accent color */}
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">
            Accent color
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {ACCENT_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => change("storefrontAccentColor", preset.value)}
                title={preset.label}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  store.storefrontAccentColor === preset.value
                    ? "border-surface-900 dark:border-white scale-110"
                    : "border-transparent hover:scale-110"
                }`}
                style={{ backgroundColor: preset.value }}
              >
                {store.storefrontAccentColor === preset.value && (
                  <Check className="w-4 h-4 text-white mx-auto drop-shadow" />
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={store.storefrontAccentColor ?? "#f59e0b"}
              onChange={(e) => change("storefrontAccentColor", e.target.value)}
              className="w-10 h-10 rounded-lg border border-surface-200 dark:border-surface-700 cursor-pointer"
            />
            <input
              value={store.storefrontAccentColor ?? "#f59e0b"}
              onChange={(e) => {
                if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) {
                  change("storefrontAccentColor", e.target.value);
                }
              }}
              className="px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white text-sm font-mono w-28 focus:outline-none focus:ring-2 focus:ring-accent-400"
            />
            <div
              className="flex-1 h-10 rounded-xl"
              style={{ backgroundColor: store.storefrontAccentColor ?? "#f59e0b" }}
            />
          </div>
        </div>

        {/* Theme mode */}
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
            Appearance
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["light", "dark", "both"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => change("storefrontThemeMode", mode)}
                className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all capitalize ${
                  store.storefrontThemeMode === mode
                    ? "border-accent-400 bg-accent-50 dark:bg-accent-950 text-accent-700 dark:text-accent-300"
                    : "border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800"
                }`}
              >
                {mode === "both" ? "Follow system" : mode}
              </button>
            ))}
          </div>
          <p className="text-xs text-surface-400 mt-1">
            &ldquo;Follow system&rdquo; matches each visitor&apos;s own light/dark preference.
          </p>
        </div>

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

      {/* Payment settings */}
      <section className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-6 space-y-5">
        <h2 className="font-bold text-surface-900 dark:text-white flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Payment settings
        </h2>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
            Accepted payment methods
          </label>
          <div className="grid sm:grid-cols-3 gap-2">
            {(["paystack", "bank_transfer", "both"] as const).map((method) => (
              <button
                key={method}
                onClick={() => change("paymentPreference", method)}
                className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all text-left ${
                  store.paymentPreference === method
                    ? "border-accent-400 bg-accent-50 dark:bg-accent-950 text-accent-700 dark:text-accent-300"
                    : "border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800"
                }`}
              >
                {method === "paystack"
                  ? "Paystack only"
                  : method === "bank_transfer"
                    ? "Bank transfer only"
                    : "Both methods"}
              </button>
            ))}
          </div>
        </div>

        {(store.paymentPreference === "bank_transfer" ||
          store.paymentPreference === "both") && (
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                Bank name
              </label>
              <input
                value={store.bankName ?? store.bank_name ?? ""}
                onChange={(e) => change("bankName", e.target.value)}
                placeholder="e.g. Access Bank"
                className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  Account number
                </label>
                <input
                  value={
                    store.bankAccountNumber ?? store.bank_account_number ?? ""
                  }
                  onChange={(e) => change("bankAccountNumber", e.target.value)}
                  placeholder="0123456789"
                  className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  Account name
                </label>
                <input
                  value={store.bankAccountName ?? store.bank_account_name ?? ""}
                  onChange={(e) => change("bankAccountName", e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {(store.paymentPreference === "paystack" ||
          store.paymentPreference === "both") && (
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Paystack public key
            </label>
            <input
              value={store.paystackPublicKey ?? store.paystack_public_key ?? ""}
              onChange={(e) => change("paystackPublicKey", e.target.value)}
              placeholder="pk_live_..."
              className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm font-mono"
            />
            <p className="text-xs text-surface-400 mt-1">
              Found in your Paystack dashboard under Settings → API Keys
            </p>
          </div>
        )}
      </section>

      {/* Return & Refund Policy */}
      <section className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-6 space-y-5">
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
      <section className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-6 space-y-5">
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

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm bg-accent-400 hover:bg-accent-500 text-black transition-all disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Save settings
        </button>
      </div>

      {/* Danger zone */}
      <section className="bg-white dark:bg-surface-900 rounded-2xl border border-red-200 dark:border-red-900/50 p-6 space-y-5 mb-8">
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
