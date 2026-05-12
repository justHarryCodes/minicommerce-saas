"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Store, ArrowRight, CheckCircle2 } from "lucide-react";
import { slugify } from "@/lib/utils";
import { PRIMARY_CATEGORIES } from "@/types";
import toast from "react-hot-toast";

const STEPS = ["Store Info", "Contact & Payment", "Branding"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

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
    }
  };

  const handleSlugChange = async (slug: string) => {
    set("slug", slug.toLowerCase().replace(/[^a-z0-9-]/g, ""));
    await checkSlug(slug);
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
      toast.error("Store name and slug required");
      return;
    }
    if (!slugAvailable) {
      toast.error("Slug not available");
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
        body: JSON.stringify(form),
      });
      const { data, error } = await res.json();
      if (error)
        throw new Error(
          typeof error === "string" ? error : "Failed to create store",
        );
      toast.success("Store created! 🎉");
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-brand-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-2xl bg-brand-400 flex items-center justify-center shadow-lg">
            <Store className="h-5 w-5 text-zinc-900" />
          </div>
          <span
            className="text-2xl font-black"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            Storely
          </span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`flex-1 h-1 rounded-full transition-colors ${i <= step ? "bg-brand-400" : "bg-zinc-200 dark:bg-zinc-800"}`}
              />
              {i === STEPS.length - 1 && null}
            </div>
          ))}
        </div>
        <p className="text-xs text-zinc-500 mb-6">
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </p>

        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl p-8 border border-zinc-100 dark:border-zinc-800">
          <h1 className="text-2xl font-bold mb-1">Set up your store</h1>
          <p className="text-zinc-500 text-sm mb-6">
            {step === 0 && "Tell us about your store"}
            {step === 1 && "How should customers contact & pay you?"}
            {step === 2 && "Add your logo (optional)"}
          </p>

          {/* Step 0 */}
          {step === 0 && (
            <div className="space-y-4">
              <Input
                label="Store name"
                placeholder="e.g. Amaka's Boutique"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
              <div>
                <Input
                  label="Store URL (slug)"
                  placeholder="amakas-boutique"
                  value={form.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  hint={`Your storefront: storely.com/store/${form.slug || "your-slug"}`}
                />
                {form.slug && (
                  <p
                    className={`text-xs mt-1 font-medium ${slugAvailable === true ? "text-emerald-600" : slugAvailable === false ? "text-red-500" : "text-zinc-400"}`}
                  >
                    {slugAvailable === true
                      ? "✓ Available"
                      : slugAvailable === false
                        ? "✗ Already taken"
                        : "Checking…"}
                  </p>
                )}
              </div>
              <Textarea
                label="Store description (optional)"
                placeholder="What do you sell? What makes your store special?"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
              />
              <Select
                label="Primary category"
                placeholder="Select a category"
                value={form.primaryCategory}
                onChange={(e) => set("primaryCategory", e.target.value)}
                options={PRIMARY_CATEGORIES.map((c) => ({
                  label: c,
                  value: c,
                }))}
              />
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <Input
                label="Phone number"
                placeholder="+234 801 234 5678"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
              <Input
                label="WhatsApp number"
                placeholder="+234 801 234 5678"
                value={form.whatsapp}
                onChange={(e) => set("whatsapp", e.target.value)}
              />

              <div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Payment methods
                </p>
                <div className="space-y-2">
                  {(["paystack", "transfer"] as const).map((m) => (
                    <label
                      key={m}
                      className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors border-zinc-200 dark:border-zinc-700 hover:border-brand-400"
                    >
                      <input
                        type="checkbox"
                        checked={form.paymentMethods.includes(m)}
                        onChange={() => togglePayment(m)}
                        className="accent-brand-400 h-4 w-4"
                      />
                      <span className="text-sm font-medium capitalize">
                        {m === "paystack"
                          ? "Paystack (online)"
                          : "Bank Transfer (manual)"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {form.paymentMethods.includes("transfer") && (
                <div className="space-y-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <p className="text-sm font-semibold">Bank account details</p>
                  <Input
                    label="Bank name"
                    placeholder="Opay / Access Bank"
                    value={form.bankName}
                    onChange={(e) => set("bankName", e.target.value)}
                  />
                  <Input
                    label="Account number"
                    placeholder="0123456789"
                    value={form.accountNumber}
                    onChange={(e) => set("accountNumber", e.target.value)}
                  />
                  <Input
                    label="Account name"
                    placeholder="Jane Amaka Okafor"
                    value={form.accountName}
                    onChange={(e) => set("accountName", e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Store logo
                </p>
                <ImageUpload
                  value={form.logoUrl}
                  onChange={(url) => set("logoUrl", url as string)}
                />
                <p className="text-xs text-zinc-500 mt-2">
                  You can always add or change this later.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-8">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                ← Back
              </Button>
            ) : (
              <div />
            )}

            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={
                  step === 0 &&
                  (!form.name || !form.slug || slugAvailable === false)
                }
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} loading={loading} size="lg">
                Launch my store 🚀
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
