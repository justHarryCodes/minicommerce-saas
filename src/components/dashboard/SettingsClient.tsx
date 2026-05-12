"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  Palette,
  CreditCard,
  Check,
  Loader2,
  Upload,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Store as StoreType } from "@/types";

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
  const [store, setStore] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

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
          bankName: store.bankName ?? store.bank_name,
          bankAccountNumber:
            store.bankAccountNumber ?? store.bank_account_number,
          bankAccountName: store.bankAccountName ?? store.bank_account_name,
          paymentPreference:
            store.paymentPreference ?? store.payment_preference,
          paystackPublicKey:
            store.paystackPublicKey ?? store.paystack_public_key,
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
                src={store.logoUrl ?? store.logo_url}
                alt="Logo"
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

        {/* Theme mode */}
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">
            Theme mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["light", "dark", "both"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => change("storefrontThemeMode", mode)}
                className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all capitalize ${
                  (store.storefrontThemeMode ??
                  store.themeMode ??
                  store.theme_mode === mode)
                    ? "border-accent-400 bg-accent-50 dark:bg-accent-950 text-accent-700 dark:text-accent-300"
                    : "border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800"
                }`}
              >
                {mode === "both"
                  ? "Auto (both)"
                  : mode === "light"
                    ? "☀️ Light"
                    : "🌙 Dark"}
              </button>
            ))}
          </div>
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
                  (store.storefrontAccentColor ??
                  store.accentColor ??
                  store.accent_color === preset.value)
                    ? "border-surface-900 dark:border-white scale-110"
                    : "border-transparent hover:scale-110"
                }`}
                style={{ backgroundColor: preset.value }}
              >
                {(store.storefrontAccentColor ??
                  store.accentColor ??
                  store.accent_color) === preset.value && (
                  <Check className="w-4 h-4 text-white mx-auto drop-shadow" />
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={
                store.storefrontAccentColor ??
                store.accentColor ??
                store.accent_color
              }
              onChange={(e) => change("storefrontAccentColor", e.target.value)}
              className="w-10 h-10 rounded-lg border border-surface-200 dark:border-surface-700 cursor-pointer"
            />
            <input
              value={
                store.storefrontAccentColor ??
                store.accentColor ??
                store.accent_color
              }
              onChange={(e) => {
                if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) {
                  change("storefrontAccentColor", e.target.value);
                }
              }}
              className="px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white text-sm font-mono w-28 focus:outline-none focus:ring-2 focus:ring-accent-400"
            />
            <div
              className="flex-1 h-10 rounded-xl"
              style={{
                backgroundColor:
                  store.storefrontAccentColor ??
                  store.accentColor ??
                  store.accent_color,
              }}
            />
          </div>
        </div>
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
                  (store.paymentPreference ?? store.payment_preference) ===
                  method
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

        {((store.paymentPreference ?? store.payment_preference) ===
          "bank_transfer" ||
          (store.paymentPreference ?? store.payment_preference) === "both") && (
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

        {((store.paymentPreference ?? store.payment_preference) ===
          "paystack" ||
          (store.paymentPreference ?? store.payment_preference) === "both") && (
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

      {/* Save button */}
      <div className="flex justify-end pb-8">
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
    </div>
  );
}
