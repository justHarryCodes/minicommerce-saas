"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, Copy, ExternalLink, Loader2, Search } from "lucide-react";

// Settings -> Google Search. Duka already does the technical SEO for every
// store; this is where a vendor connects their store to their own Google
// Search Console, to submit the sitemap and see how they're found.

const DONE = [
  "Product pages show price, stock, ratings, shipping and returns in Google results",
  "A sitemap lists every product, category and page, and updates itself",
  "Each page has its own title, description and link preview",
  "Checkout, receipts and order tracking are kept out of Google",
];

export default function GoogleSearchSettings({ storeUrl, initialCode }: { storeUrl: string; initialCode: string | null }) {
  const [code, setCode] = useState(initialCode ?? "");
  const [saved, setSaved] = useState(initialCode ?? "");
  const [saving, setSaving] = useState(false);
  const sitemap = `${storeUrl}/sitemap.xml`;

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/seo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't save");
      setSaved(data.code ?? "");
      setCode(data.code ?? "");
      toast.success(data.code ? "Saved. Now click Verify in Search Console." : "Removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  const copy = (t: string) => navigator.clipboard.writeText(t).then(() => toast.success("Copied"), () => toast.error("Couldn't copy"));
  const link = "font-semibold text-amber-700 underline dark:text-amber-400";

  return (
    <section className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-6 space-y-5">
      <div>
        <h2 className="font-bold text-surface-900 dark:text-white flex items-center gap-2">
          <Search className="w-4 h-4" /> Google Search
        </h2>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">Duka gets your store ready for Google automatically:</p>
      </div>

      <ul className="space-y-1.5">
        {DONE.map((d) => (
          <li key={d} className="flex gap-2 text-sm text-surface-700 dark:text-surface-300">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-600" /> {d}
          </li>
        ))}
      </ul>

      <div>
        <p className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Your sitemap</p>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-surface-50 px-2.5 py-2 text-xs text-surface-700 dark:bg-surface-800 dark:text-surface-300">{sitemap}</code>
          <button type="button" onClick={() => copy(sitemap)} className="flex shrink-0 items-center gap-1 rounded-lg border border-surface-200 px-2.5 py-2 text-xs font-semibold text-surface-700 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800">
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-surface-50 dark:bg-surface-800/50 p-4 space-y-3">
        <p className="text-sm font-semibold text-surface-900 dark:text-white">Get found faster: connect Google Search Console (free)</p>
        <ol className="list-decimal pl-5 space-y-1.5 text-sm text-surface-600 dark:text-surface-400">
          <li>
            Open <a href="https://search.google.com/search-console/welcome" target="_blank" rel="noopener noreferrer" className={link}>Google Search Console</a>, choose <strong>URL prefix</strong> and enter <strong className="break-all">{storeUrl}</strong>
          </li>
          <li>Under <strong>Other verification methods</strong>, pick <strong>HTML tag</strong> and copy it</li>
          <li>Paste it below and tap <strong>Save</strong>, then tap <strong>Verify</strong> in Search Console</li>
          <li>Go to <strong>Sitemaps</strong>, type <code className="rounded bg-white px-1 dark:bg-surface-900">sitemap.xml</code> and submit</li>
        </ol>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={'<meta name="google-site-verification" content="…" />'}
            aria-label="Google verification tag"
            className="min-w-0 flex-1 px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            type="button"
            onClick={save}
            disabled={saving || code.trim() === saved}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-900 text-white dark:bg-white dark:text-surface-900 text-sm font-semibold disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
          </button>
        </div>
        {saved && (
          <p className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Verification tag is on your store. The same tag also verifies your site in Google Merchant Center.
          </p>
        )}
      </div>

      <a
        href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(`${storeUrl}/`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-surface-700 hover:text-surface-900 dark:text-surface-300 dark:hover:text-white"
      >
        Test your store in Google&apos;s Rich Results Test <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </section>
  );
}
