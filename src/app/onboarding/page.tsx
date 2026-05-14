"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ImageUpload } from "@/components/ui/ImageUpload";
import {
  Store,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  ShoppingBag,
  Phone,
  CreditCard,
  Image as ImageIcon,
  CheckCircle2,
  Globe,
  Zap,
  Building2,
} from "lucide-react";
import { slugify } from "@/lib/utils";
import { PRIMARY_CATEGORIES } from "@/types";
import toast from "react-hot-toast";

const STEPS = [
  { id: 0, label: "Store Info", icon: Store, desc: "Name & details" },
  { id: 1, label: "Contact", icon: Phone, desc: "Phone & payments" },
  { id: 2, label: "Branding", icon: ImageIcon, desc: "Logo & finish" },
];

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all";

function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setReferralCode(ref.toUpperCase());
  }, [searchParams]);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    primaryCategory: "",
    phone: "",
    whatsapp: "",
    paymentMethods: ["paystack"] as ("paystack" | "transfer")[],
    bankName: "",
    accountNumber: "",
    accountName: "",
    logoUrl: "",
  });

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleNameChange = async (name: string) => {
    set("name", name);
    if (name.length >= 2) {
      const slug = slugify(name);
      set("slug", slug);
      checkSlug(slug);
    }
  };

  const checkSlug = async (slug: string) => {
    if (slug.length < 2) return;
    setCheckingSlug(true);
    try {
      const res = await fetch(`/api/stores/slug-check?slug=${slug}`);
      if (!res.ok) {
        setSlugAvailable(null);
        return;
      }
      const text = await res.text();
      if (!text) {
        setSlugAvailable(null);
        return;
      }
      const { available } = JSON.parse(text);
      setSlugAvailable(available);
    } catch {
      setSlugAvailable(null);
    } finally {
      setCheckingSlug(false);
    }
  };

  const handleSlugChange = async (slug: string) => {
    const clean = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    set("slug", clean);
    await checkSlug(clean);
  };

  const togglePayment = (method: "paystack" | "transfer") => {
    set(
      "paymentMethods",
      form.paymentMethods.includes(method)
        ? form.paymentMethods.filter((m) => m !== method)
        : [...form.paymentMethods, method],
    );
  };

  const handleSubmit = async () => {
    if (!form.name || !form.slug) {
      toast.error("Store name required");
      return;
    }
    if (!slugAvailable) {
      toast.error("Choose an available store URL");
      return;
    }
    if (form.paymentMethods.length === 0) {
      toast.error("Select at least one payment method");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, referralCode }),
      });
      const { error } = await res.json();
      if (error)
        throw new Error(
          typeof error === "string" ? error : "Failed to create store",
        );
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const canProceed =
    step === 0 ? !!(form.name && form.slug && slugAvailable === true) : true;

  // ── Success screen ──
  if (done) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white mb-3">
            Store created! 🎉
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-2">
            Taking you to your dashboard…
          </p>
          <div className="flex justify-center mt-4">
            <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex">
      {/* ── Left sidebar ── */}
      <div className="hidden lg:flex flex-col w-80 bg-zinc-900 p-10 justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-black" />
            </div>
            <span className="text-white text-lg font-extrabold">ShopForge</span>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {STEPS.map(({ id, label, icon: Icon, desc }) => (
              <div
                key={id}
                className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                  id === step
                    ? "bg-amber-400/10 border border-amber-400/30"
                    : id < step
                      ? "opacity-60"
                      : "opacity-30"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    id < step
                      ? "bg-green-500"
                      : id === step
                        ? "bg-amber-400"
                        : "bg-zinc-700"
                  }`}
                >
                  {id < step ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <Icon
                      className={`w-5 h-5 ${id === step ? "text-black" : "text-zinc-400"}`}
                    />
                  )}
                </div>
                <div>
                  <p
                    className={`text-sm font-semibold ${id === step ? "text-white" : "text-zinc-400"}`}
                  >
                    {label}
                  </p>
                  <p className="text-xs text-zinc-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tip */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-zinc-400 text-xs leading-relaxed">
            💡 You can always update your store details, logo, and payment
            settings later from the dashboard.
          </p>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-black" />
            </div>
            <span className="font-extrabold text-zinc-900 dark:text-white">
              ShopForge
            </span>
          </div>
          <span className="text-xs text-zinc-400 font-medium">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>

        {/* Mobile progress bar */}
        <div className="lg:hidden h-1 bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full bg-amber-400 transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-xl">
            {/* Referral notice */}
            {referralCode && (
              <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300 font-medium">
                🎁 Referred by <strong className="font-mono">{referralCode}</strong> — your friend earns 1 free month when you pay your setup fee!
              </div>
            )}

            {/* Step heading */}
            <div className="mb-8">
              <p className="text-amber-500 dark:text-amber-400 text-sm font-semibold mb-1 uppercase tracking-wide">
                Step {step + 1} of {STEPS.length}
              </p>
              <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white">
                {step === 0 && "Tell us about your store"}
                {step === 1 && "Contact & payment"}
                {step === 2 && "Add your logo"}
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                {step === 0 &&
                  "This is what customers will see when they visit your store."}
                {step === 1 &&
                  "How customers can reach you and pay for orders."}
                {step === 2 &&
                  "A logo makes your store look professional. You can skip this for now."}
              </p>
            </div>

            {/* ── Step 0: Store Info ── */}
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Store name <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={inputClass}
                    placeholder="e.g. Amaka's Boutique"
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Store URL <span className="text-red-500">*</span>
                  </label>
                  <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden focus-within:ring-2 focus-within:ring-amber-400">
                    <span className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-sm border-r border-zinc-200 dark:border-zinc-700 shrink-0">
                      shopforge.com/store/
                    </span>
                    <input
                      className="flex-1 px-3 py-3 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm focus:outline-none"
                      placeholder="your-store"
                      value={form.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                    />
                  </div>
                  {form.slug && (
                    <p
                      className={`text-xs mt-1.5 font-medium flex items-center gap-1 ${
                        checkingSlug
                          ? "text-zinc-400"
                          : slugAvailable === true
                            ? "text-emerald-600 dark:text-emerald-400"
                            : slugAvailable === false
                              ? "text-red-500"
                              : "text-zinc-400"
                      }`}
                    >
                      {checkingSlug
                        ? "Checking availability…"
                        : slugAvailable === true
                          ? "✓ Available"
                          : slugAvailable === false
                            ? "✗ Already taken — try another"
                            : ""}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Description{" "}
                    <span className="text-zinc-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    className={inputClass + " resize-none"}
                    rows={3}
                    placeholder="What do you sell? What makes your store special?"
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Category{" "}
                    <span className="text-zinc-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <select
                    className={inputClass}
                    value={form.primaryCategory}
                    onChange={(e) => set("primaryCategory", e.target.value)}
                  >
                    <option value="">Select a category</option>
                    {PRIMARY_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* ── Step 1: Contact & Payment ── */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Phone number
                    </label>
                    <input
                      className={inputClass}
                      placeholder="+234 801 234 5678"
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      WhatsApp number
                    </label>
                    <input
                      className={inputClass}
                      placeholder="+234 801 234 5678"
                      value={form.whatsapp}
                      onChange={(e) => set("whatsapp", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                    Payment methods <span className="text-red-500">*</span>
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {(
                      [
                        {
                          id: "paystack",
                          label: "Paystack",
                          sub: "Cards, bank transfer online",
                          icon: Zap,
                        },
                        {
                          id: "transfer",
                          label: "Bank Transfer",
                          sub: "Manual payment confirmation",
                          icon: Building2,
                        },
                      ] as const
                    ).map(({ id, label, sub, icon: Icon }) => (
                      <label
                        key={id}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          form.paymentMethods.includes(id)
                            ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20"
                            : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={form.paymentMethods.includes(id)}
                          onChange={() => togglePayment(id)}
                        />
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            form.paymentMethods.includes(id)
                              ? "bg-amber-400"
                              : "bg-zinc-100 dark:bg-zinc-800"
                          }`}
                        >
                          <Icon
                            className={`w-5 h-5 ${form.paymentMethods.includes(id) ? "text-black" : "text-zinc-400"}`}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                            {label}
                          </p>
                          <p className="text-xs text-zinc-500">{sub}</p>
                        </div>
                        {form.paymentMethods.includes(id) && (
                          <Check className="w-4 h-4 text-amber-600 ml-auto shrink-0" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {form.paymentMethods.includes("transfer") && (
                  <div className="bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl p-5 space-y-4">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      Bank account details
                    </p>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">
                        Bank name
                      </label>
                      <input
                        className={inputClass}
                        placeholder="e.g. Opay, Access Bank"
                        value={form.bankName}
                        onChange={(e) => set("bankName", e.target.value)}
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">
                          Account number
                        </label>
                        <input
                          className={inputClass + " font-mono"}
                          placeholder="0123456789"
                          value={form.accountNumber}
                          onChange={(e) => set("accountNumber", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">
                          Account name
                        </label>
                        <input
                          className={inputClass}
                          placeholder="Jane Okafor"
                          value={form.accountName}
                          onChange={(e) => set("accountName", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Branding ── */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">
                    Store logo
                  </p>
                  <ImageUpload
                    value={form.logoUrl}
                    onChange={(url) => set("logoUrl", url)}
                  />
                  <p className="text-xs text-zinc-400 mt-3">
                    Recommended: square image, at least 200×200px. PNG or JPG.
                  </p>
                </div>

                {/* Summary card */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Store summary
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Name</span>
                      <span className="font-semibold text-zinc-900 dark:text-white">
                        {form.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">URL</span>
                      <span className="font-semibold text-zinc-900 dark:text-white text-xs font-mono">
                        /store/{form.slug}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Payments</span>
                      <span className="font-semibold text-zinc-900 dark:text-white capitalize">
                        {form.paymentMethods.join(" & ")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              {step > 0 ? (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <div />
              )}

              {step < STEPS.length - 1 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canProceed}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm transition-all shadow-sm"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-black font-bold text-sm transition-all shadow-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Launching...
                    </>
                  ) : (
                    <>Launch my store 🚀</>
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

export default function OnboardingPageWrapper() {
  return (
    <Suspense>
      <OnboardingPage />
    </Suspense>
  );
}
