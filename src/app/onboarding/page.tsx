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
  Image as ImageIcon,
  CheckCircle2,
  Zap,
  Building2,
  Sparkles,
  X,
  Copy,
  Lock,
} from "lucide-react";
import { slugify } from "@/lib/utils";
import { PRIMARY_CATEGORIES } from "@/types";
import toast from "react-hot-toast";

// Preview text only (the real routing decision is middleware.ts's own
// ROOT_DOMAIN fallback) — kept in sync with the same env var + fallback so
// a future domain change doesn't require hunting down a second hardcoded
// literal here.
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "dukanigeria.com";

const STEPS = [
  {
    id: 0,
    label: "Store info",
    icon: Store,
    title: "Tell us about your store",
    desc: "This is what customers will see when they visit your store.",
  },
  {
    id: 1,
    label: "Contact & pay",
    icon: Phone,
    title: "How will customers pay you?",
    desc: "Add your contact details and choose how you get paid.",
  },
  {
    id: 2,
    label: "Branding",
    icon: ImageIcon,
    title: "Add your logo",
    desc: "A logo makes your store look professional. You can skip this for now.",
  },
];

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all";

const labelClass =
  "block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5";

type PayMethod = "paystack" | "transfer";

/* ───────────────────────── Live store preview ───────────────────────── */

function StorePreview({
  name,
  slug,
  description,
  category,
  logoUrl,
  methods,
}: {
  name: string;
  slug: string;
  description: string;
  category: string;
  logoUrl: string;
  methods: PayMethod[];
}) {
  const displayName = name.trim() || "Your store name";
  return (
    <div className="rounded-3xl bg-white dark:bg-zinc-900 shadow-2xl shadow-black/30 overflow-hidden">
      {/* Browser bar */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800">
        <span className="w-2 h-2 rounded-full bg-red-400" />
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        <span className="w-2 h-2 rounded-full bg-green-400" />
        <span className="ml-2 flex-1 truncate rounded-full bg-white dark:bg-zinc-900 px-3 py-1 text-[10px] font-medium text-zinc-400">
          {slug || "your-store"}.{ROOT_DOMAIN}
        </span>
      </div>

      {/* Banner */}
      <div className="h-20 bg-gradient-to-br from-amber-200 to-amber-400" />

      <div className="px-5 pb-5">
        <div className="-mt-8 mb-3 flex items-end justify-between">
          <div className="w-16 h-16 rounded-2xl border-4 border-white dark:border-zinc-900 bg-white dark:bg-zinc-900 overflow-hidden shadow-md flex items-center justify-center">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="w-full h-full flex items-center justify-center bg-amber-400 text-2xl font-black text-black">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {category && (
            <span className="mb-1 max-w-[55%] truncate rounded-full bg-amber-100 dark:bg-amber-900/30 px-2.5 py-1 text-[10px] font-bold text-amber-800 dark:text-amber-300">
              {category}
            </span>
          )}
        </div>

        <p
          className={`text-lg font-black leading-tight ${name.trim() ? "text-zinc-900 dark:text-white" : "text-zinc-300 dark:text-zinc-600"}`}
        >
          {displayName}
        </p>
        <p className="mt-1 line-clamp-2 min-h-[2.25rem] text-xs leading-relaxed text-zinc-500">
          {description.trim() || "Your store description will appear here."}
        </p>

        {/* Skeleton products */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1.5"
            >
              <div className="aspect-square rounded-lg bg-zinc-200 dark:bg-zinc-700" />
              <div className="mt-1.5 h-1.5 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="mt-1 h-1.5 w-1/2 rounded bg-amber-300" />
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {methods.length === 0 ? (
            <span className="text-[10px] text-zinc-400">
              No payment method selected
            </span>
          ) : (
            methods.map((m) => (
              <span
                key={m}
                className="inline-flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300"
              >
                {m === "paystack" ? (
                  <Zap className="w-3 h-3" />
                ) : (
                  <Building2 className="w-3 h-3" />
                )}
                {m === "paystack" ? "Paystack" : "Bank transfer"}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── Page ───────────────────────────── */

function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
    paymentMethods: ["paystack"] as PayMethod[],
    bankName: "",
    accountNumber: "",
    accountName: "",
    logoUrl: "",
  });

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  // AI-suggested store structure (categories/subcategories from the
  // Description text above). Held in local state and only actually created
  // once the store itself exists — see handleSubmit.
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [suggestedCategories, setSuggestedCategories] = useState<
    { name: string; subcategories: string[] }[]
  >([]);

  const suggestStoreStructure = async () => {
    if (form.description.trim().length < 10) {
      toast.error("Add a bit more detail to your description first");
      return;
    }
    setAiSuggesting(true);
    try {
      const res = await fetch("/api/ai/suggest-store-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: form.description.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Suggestion failed");
      if (data.primaryCategory) set("primaryCategory", data.primaryCategory);
      setSuggestedCategories(data.categories ?? []);
      toast.success("Suggested categories ready. Review them below.");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't generate suggestions",
      );
    } finally {
      setAiSuggesting(false);
    }
  };

  const removeSuggestedCategory = (name: string) => {
    setSuggestedCategories((prev) => prev.filter((c) => c.name !== name));
  };

  const removeSuggestedSubcategory = (categoryName: string, sub: string) => {
    setSuggestedCategories((prev) =>
      prev.map((c) =>
        c.name === categoryName
          ? { ...c, subcategories: c.subcategories.filter((s) => s !== sub) }
          : c,
      ),
    );
  };

  // Auto-fill the URL from the name until the user edits the URL themselves.
  const handleNameChange = (name: string) => {
    set("name", name);
    if (!slugTouched) set("slug", slugify(name));
  };

  const handleSlugChange = (slug: string) => {
    setSlugTouched(true);
    set("slug", slug.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  };

  // Debounced availability check; stale responses are ignored.
  useEffect(() => {
    const slug = form.slug;
    setSlugAvailable(null);
    if (slug.length < 2) {
      setCheckingSlug(false);
      return;
    }
    setCheckingSlug(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/stores/slug-check?slug=${encodeURIComponent(slug)}`,
        );
        if (!res.ok) {
          if (!cancelled) setSlugAvailable(null);
          return;
        }
        const text = await res.text();
        if (!text) {
          if (!cancelled) setSlugAvailable(null);
          return;
        }
        const { available } = JSON.parse(text);
        if (!cancelled) setSlugAvailable(available);
      } catch {
        if (!cancelled) setSlugAvailable(null);
      } finally {
        if (!cancelled) setCheckingSlug(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [form.slug]);

  const togglePayment = (method: PayMethod) => {
    set(
      "paymentMethods",
      form.paymentMethods.includes(method)
        ? form.paymentMethods.filter((m) => m !== method)
        : [...form.paymentMethods, method],
    );
  };

  const handleSubmit = async () => {
    if (form.name.trim().length < 2 || !form.slug) {
      toast.error("Store name must be at least 2 characters");
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
      const { data, error } = await res.json();
      if (error)
        throw new Error(
          typeof error === "string" ? error : "Failed to create store",
        );

      // Best-effort: create any AI-suggested categories now that the store
      // exists. A failure here must never block the "store created"
      // success screen — the merchant already has a working store either
      // way, this is a nice-to-have on top.
      if (suggestedCategories.length && data?.id) {
        await Promise.allSettled(
          suggestedCategories.map(async (cat) => {
            const catRes = await fetch("/api/categories", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: cat.name }),
            });
            const catJson = await catRes.json();
            const parentId = catJson?.data?.id;
            if (!parentId) return;
            await Promise.allSettled(
              cat.subcategories.map((sub) =>
                fetch("/api/categories", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: sub, parentId }),
                }),
              ),
            );
          }),
        );
      }

      setDone(true);
      setTimeout(() => router.push("/dashboard"), 3500);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const transferSelected = form.paymentMethods.includes("transfer");
  const transferComplete =
    !transferSelected ||
    (form.bankName.trim() &&
      form.accountNumber.trim().length >= 10 &&
      form.accountName.trim());

  const canProceed =
    step === 0
      ? !!(form.name && form.slug && slugAvailable === true)
      : step === 1
        ? form.paymentMethods.length > 0 && !!transferComplete
        : true;

  const current = STEPS[step];
  const storeUrl = `${form.slug}.${ROOT_DOMAIN}`;

  // ── Success screen ──
  if (done) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center max-w-md w-full">
          <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white mb-2">
            Your store is live! 🎉
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-6">
            {form.name} is ready for its first customer.
          </p>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Your store link
            </p>
            <div className="flex items-center gap-2">
              <span className="flex-1 truncate rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-2.5 font-mono text-sm text-zinc-900 dark:text-white">
                {ROOT_DOMAIN}/store/{form.slug}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard
                    .writeText(`https://${ROOT_DOMAIN}/store/${form.slug}`)
                    .then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1800);
                    });
                }}
                className="flex items-center gap-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 px-3.5 py-2.5 text-sm font-bold text-black transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-left">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-300 mb-2">
              Next steps
            </p>
            <ul className="space-y-1.5 text-sm text-amber-800 dark:text-amber-300/90">
              <li>1. Add your first products</li>
              <li>2. Share your link on WhatsApp and Instagram</li>
              <li>3. Watch orders arrive in your dashboard</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-500 px-6 py-3.5 text-sm font-bold text-black transition-colors"
          >
            Go to dashboard <ArrowRight className="w-4 h-4" />
          </button>
          <p className="mt-3 flex items-center justify-center gap-2 text-xs text-zinc-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />{" "}
            Taking you there automatically…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 lg:flex">
      {/* ═════════ Left brand + live preview (desktop) ═════════ */}
      <aside className="hidden lg:flex flex-col w-[440px] xl:w-[480px] shrink-0 bg-zinc-900 p-10 xl:p-12 justify-between relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-amber-400 opacity-10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-black" />
            </div>
            <span className="text-white text-xl font-extrabold">Duka</span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-black text-white leading-tight mb-3">
            Launch your store{" "}
            <span className="text-amber-400">in minutes.</span>
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-8 max-w-sm">
            Watch your store take shape as you fill in each step. You can change
            everything later from your dashboard.
          </p>

          <StorePreview
            name={form.name}
            slug={form.slug}
            description={form.description}
            category={form.primaryCategory}
            logoUrl={form.logoUrl}
            methods={form.paymentMethods}
          />
        </div>

        <p className="relative mt-8 text-xs text-zinc-500 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5" /> Free to start · No card required
        </p>
      </aside>

      {/* ═════════ Main ═════════ */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-5 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-black" />
            </div>
            <span className="font-extrabold text-zinc-900 dark:text-white">
              Duka
            </span>
          </div>
          <span className="text-xs text-zinc-400 font-medium">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>

        <div className="flex-1 flex justify-center px-5 py-8 sm:px-8 lg:px-12 lg:py-14">
          <div className="w-full max-w-xl">
            {/* Stepper */}
            <ol
              className="flex items-center gap-2 mb-8"
              aria-label="Setup progress"
            >
              {STEPS.map(({ id, label, icon: Icon }, i) => {
                const doneStep = id < step;
                const active = id === step;
                return (
                  <li
                    key={id}
                    className="flex items-center gap-2 flex-1 last:flex-none"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                        doneStep
                          ? "bg-green-500 text-white"
                          : active
                            ? "bg-amber-400 text-black"
                            : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400"
                      }`}
                      aria-current={active ? "step" : undefined}
                    >
                      {doneStep ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </span>
                    <span
                      className={`hidden sm:block text-sm font-semibold whitespace-nowrap ${
                        active
                          ? "text-zinc-900 dark:text-white"
                          : "text-zinc-400"
                      }`}
                    >
                      {label}
                    </span>
                    {i < STEPS.length - 1 && (
                      <span
                        className="h-0.5 flex-1 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden"
                        aria-hidden
                      >
                        <span
                          className="block h-full bg-green-500 transition-all duration-500"
                          style={{ width: doneStep ? "100%" : "0%" }}
                        />
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>

            {/* Referral notice */}
            {referralCode && (
              <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300 font-medium">
                🎁 Referred by{" "}
                <strong className="font-mono">{referralCode}</strong>. Your
                referrer earns a reward when you pay your setup fee!
              </div>
            )}

            {/* Heading */}
            <div className="mb-7">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white">
                {current.title}
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 mt-1.5 text-sm sm:text-base">
                {current.desc}
              </p>
            </div>

            {/* ── Step 0: Store info ── */}
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <label className={labelClass}>
                    Store name <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={inputClass}
                    placeholder="e.g. Amaka's Boutique"
                    maxLength={100}
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    autoFocus
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Store link <span className="text-red-500">*</span>
                  </label>
                  <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden focus-within:ring-2 focus-within:ring-amber-400 bg-white dark:bg-zinc-900">
                    <span className="hidden sm:flex items-center px-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-sm border-r border-zinc-200 dark:border-zinc-700 shrink-0">
                      {ROOT_DOMAIN}/store/
                    </span>
                    <input
                      className="flex-1 min-w-0 px-4 py-3 bg-transparent text-zinc-900 dark:text-white text-sm focus:outline-none"
                      placeholder="your-store"
                      value={form.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                    />
                    <span className="flex items-center pr-3.5">
                      {checkingSlug ? (
                        <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                      ) : slugAvailable === true ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : slugAvailable === false ? (
                        <X className="w-4 h-4 text-red-500" />
                      ) : null}
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-1.5 font-medium ${
                      slugAvailable === true
                        ? "text-emerald-600 dark:text-emerald-400"
                        : slugAvailable === false
                          ? "text-red-500"
                          : "text-zinc-400"
                    }`}
                  >
                    {!form.slug
                      ? "Your store link is created from your store name."
                      : checkingSlug
                        ? "Checking availability…"
                        : slugAvailable === true
                          ? `Available · ${storeUrl}`
                          : slugAvailable === false
                            ? "Already taken. Try another."
                            : ""}
                  </p>
                </div>

                <div>
                  <label className={labelClass}>
                    Description{" "}
                    <span className="text-zinc-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    className={inputClass + " resize-none"}
                    rows={3}
                    placeholder="What do you sell? What makes your store special?"
                    maxLength={1000}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                  />
                  {form.description.length > 800 && (
                    <p className="text-xs text-zinc-400 mt-1 text-right">{form.description.length}/1000</p>
                  )}
                  <button
                    type="button"
                    onClick={suggestStoreStructure}
                    disabled={
                      aiSuggesting || form.description.trim().length < 10
                    }
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 px-3.5 py-2 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {aiSuggesting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {aiSuggesting
                      ? "Organizing your store…"
                      : "Suggest categories with AI"}
                  </button>

                  {suggestedCategories.length > 0 && (
                    <div className="mt-3 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 space-y-3">
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                        We&apos;ll set these up for you. Remove anything you
                        don&apos;t want.
                      </p>
                      <div className="space-y-2">
                        {suggestedCategories.map((cat) => (
                          <div
                            key={cat.name}
                            className="bg-white dark:bg-zinc-900 rounded-xl p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold text-zinc-900 dark:text-white">
                                {cat.name}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  removeSuggestedCategory(cat.name)
                                }
                                className="text-zinc-400 hover:text-red-500 transition-colors shrink-0"
                                aria-label={`Remove ${cat.name}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {cat.subcategories.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {cat.subcategories.map((sub) => (
                                  <span
                                    key={sub}
                                    className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-600 dark:text-zinc-400"
                                  >
                                    {sub}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeSuggestedSubcategory(
                                          cat.name,
                                          sub,
                                        )
                                      }
                                      className="text-zinc-400 hover:text-red-500 transition-colors"
                                      aria-label={`Remove ${sub}`}
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className={labelClass}>
                    What do you mostly sell?{" "}
                    <span className="text-zinc-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRIMARY_CATEGORIES.map((c) => {
                      const active = form.primaryCategory === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          aria-pressed={active}
                          onClick={() =>
                            set("primaryCategory", active ? "" : c)
                          }
                          className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition-all ${
                            active
                              ? "border-amber-400 bg-amber-400 text-black"
                              : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900"
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 1: Contact & payment ── */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Phone number</label>
                    <input
                      className={inputClass}
                      type="tel"
                      inputMode="tel"
                      placeholder="+234 801 234 5678"
                      maxLength={30}
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>WhatsApp number</label>
                    <input
                      className={inputClass}
                      type="tel"
                      inputMode="tel"
                      placeholder="+234 801 234 5678"
                      maxLength={30}
                      value={form.whatsapp}
                      onChange={(e) => set("whatsapp", e.target.value)}
                    />
                    <p className="text-xs text-zinc-400 mt-1">
                      Shoppers can order and chat with you here.
                    </p>
                  </div>
                </div>

                <div>
                  <p className={labelClass + " mb-3"}>
                    Payment methods <span className="text-red-500">*</span>
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {(
                      [
                        {
                          id: "paystack",
                          label: "Paystack",
                          sub: "Cards, bank and USSD online",
                          icon: Zap,
                        },
                        {
                          id: "transfer",
                          label: "Bank transfer",
                          sub: "You confirm payments manually",
                          icon: Building2,
                        },
                      ] as const
                    ).map(({ id, label, sub, icon: Icon }) => {
                      const on = form.paymentMethods.includes(id);
                      return (
                        <label
                          key={id}
                          className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                            on
                              ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20"
                              : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={on}
                            onChange={() => togglePayment(id)}
                          />
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                              on
                                ? "bg-amber-400"
                                : "bg-zinc-100 dark:bg-zinc-800"
                            }`}
                          >
                            <Icon
                              className={`w-5 h-5 ${on ? "text-black" : "text-zinc-400"}`}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-zinc-900 dark:text-white">
                              {label}
                            </p>
                            <p className="text-xs text-zinc-500">{sub}</p>
                          </div>
                          {on && (
                            <Check className="w-4 h-4 text-amber-600 ml-auto shrink-0" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                  {form.paymentMethods.length === 0 && (
                    <p className="text-xs text-red-500 mt-2">
                      Select at least one payment method.
                    </p>
                  )}
                </div>

                {transferSelected && (
                  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">
                        Bank account for transfers
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Customers will see these details at checkout.
                      </p>
                    </div>
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
                          className={inputClass + " font-mono tracking-wider"}
                          inputMode="numeric"
                          maxLength={10}
                          placeholder="0123456789"
                          value={form.accountNumber}
                          onChange={(e) =>
                            set(
                              "accountNumber",
                              e.target.value.replace(/\D/g, "").slice(0, 10),
                            )
                          }
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
                    {!transferComplete && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Fill in all three fields (10-digit account number) to
                        continue, or turn off bank transfer.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Branding ── */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white mb-4">
                    Store logo
                  </p>
                  <ImageUpload
                    value={form.logoUrl}
                    onChange={(url) => set("logoUrl", url)}
                  />
                  <p className="text-xs text-zinc-400 mt-3">
                    Square image, at least 200×200px. PNG or JPG.
                  </p>
                </div>

                {/* Mobile preview (desktop has the side panel) */}
                <div className="lg:hidden">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                    Your store preview
                  </p>
                  <StorePreview
                    name={form.name}
                    slug={form.slug}
                    description={form.description}
                    category={form.primaryCategory}
                    logoUrl={form.logoUrl}
                    methods={form.paymentMethods}
                  />
                </div>

                <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-5 text-sm space-y-2.5">
                  <div className="flex justify-between gap-3">
                    <span className="text-zinc-500">Store</span>
                    <span className="font-bold text-zinc-900 dark:text-white text-right">
                      {form.name}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-zinc-500 shrink-0">Link</span>
                    <div className="text-right min-w-0">
                      <p className="font-mono text-xs font-semibold text-zinc-900 dark:text-white truncate">
                        {storeUrl}
                      </p>
                      <p className="font-mono text-xs text-zinc-400 truncate">
                        {ROOT_DOMAIN}/store/{form.slug}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-zinc-500">Payments</span>
                    <span className="font-semibold text-zinc-900 dark:text-white capitalize text-right">
                      {form.paymentMethods.join(" & ")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <div />
              )}

              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canProceed}
                  className="flex items-center gap-2 px-7 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm transition-all shadow-sm"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-black font-bold text-sm transition-all shadow-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Launching…
                    </>
                  ) : (
                    <>Launch my store 🚀</>
                  )}
                </button>
              )}
            </div>

            {step === 2 && !form.logoUrl && (
              <p className="text-center text-xs text-zinc-400 mt-4">
                No logo yet? No problem. Just launch and add one later.
              </p>
            )}
          </div>
        </div>
      </main>
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
