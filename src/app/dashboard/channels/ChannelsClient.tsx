"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, Link2, Loader2 } from "lucide-react";

interface Props {
  feedsEnabled: boolean;
  feeds: { google: string; meta: string; csv: string };
  readiness: { total: number; ready: number; no_image: number; no_description: number };
  preview: { title: string; image: string | null; site: string; url: string };
}

function copy(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success("Copied"), () => toast.error("Couldn't copy"));
}

function FeedUrl({ url }: { url: string }) {
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-lg bg-surface-50 px-2.5 py-2 text-xs text-surface-700 dark:bg-surface-800 dark:text-surface-300">{url}</code>
      <button type="button" onClick={() => copy(url)} className="flex shrink-0 items-center gap-1 rounded-lg border border-surface-200 px-2.5 py-2 text-xs font-semibold text-surface-700 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800">
        <Copy className="h-3.5 w-3.5" /> Copy
      </button>
    </div>
  );
}

export default function ChannelsClient({ feedsEnabled, feeds, readiness, preview }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(feedsEnabled);
  const [saving, setSaving] = useState(false);

  async function toggle(next: boolean) {
    setSaving(true);
    const res = await fetch("/api/dashboard/channels", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedsEnabled: next }),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) return toast.error("Couldn't update");
    setEnabled(next);
    toast.success(next ? "Product feeds are on" : "Product feeds are off");
    router.refresh();
  }

  const card = "rounded-2xl border border-surface-100 bg-white p-5 dark:border-surface-800 dark:bg-surface-900";
  const skipped = readiness.total - readiness.ready;

  return (
    <div className="space-y-5">
      <div className={`${card} flex flex-wrap items-center gap-4`}>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-surface-900 dark:text-white">Product feeds</p>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            {readiness.ready} of {readiness.total} product{readiness.total === 1 ? "" : "s"} ready to list
            {skipped > 0 ? ` · ${skipped} skipped (no photo)` : ""}. Services and hidden products are never listed.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-surface-800 dark:text-surface-200">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          <input type="checkbox" className="h-5 w-5 accent-accent-500" checked={enabled} disabled={saving} onChange={(e) => toggle(e.target.checked)} />
          {enabled ? "On" : "Off"}
        </label>
      </div>

      {(readiness.no_image > 0 || readiness.no_description > 0) && (
        <div className="flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {readiness.no_image > 0 && <>{readiness.no_image} product{readiness.no_image === 1 ? " has" : "s have"} no photo and can&apos;t be listed. </>}
            {readiness.no_description > 0 && <>{readiness.no_description} {readiness.no_description === 1 ? "has" : "have"} no description — Google ranks those lower.</>}
          </p>
        </div>
      )}

      {enabled && (
        <>
          <section className={`${card} space-y-3`}>
            <p className="font-semibold text-surface-900 dark:text-white">Google Shopping & free listings</p>
            <FeedUrl url={feeds.google} />
            <ol className="list-decimal space-y-1 pl-5 text-sm text-surface-600 dark:text-surface-300">
              <li>Open <a className="font-semibold underline" href="https://merchants.google.com" target="_blank" rel="noopener noreferrer">Google Merchant Center</a> and verify your store website.</li>
              <li>Go to <strong>Products → Add products → Add from a file → Enter a link</strong>.</li>
              <li>Paste the link above and set it to fetch <strong>daily</strong>. Choose Nigeria and Naira.</li>
            </ol>
          </section>

          <section className={`${card} space-y-3`}>
            <p className="font-semibold text-surface-900 dark:text-white">Facebook & Instagram Shop</p>
            <FeedUrl url={feeds.meta} />
            <ol className="list-decimal space-y-1 pl-5 text-sm text-surface-600 dark:text-surface-300">
              <li>Open <a className="font-semibold underline" href="https://business.facebook.com/commerce" target="_blank" rel="noopener noreferrer">Meta Commerce Manager</a> and create a catalog (type: e-commerce).</li>
              <li>Go to <strong>Catalog → Data sources → Add items → Data feed → Scheduled feed</strong>.</li>
              <li>Paste the link above and schedule it <strong>daily</strong>. Then tag products in your Instagram posts and reels.</li>
            </ol>
            <p className="text-xs text-surface-400">
              Prefer a spreadsheet? <a href={feeds.csv} className="font-semibold underline">Download CSV</a> — Meta accepts this format too.
            </p>
          </section>
        </>
      )}

      <section className={`${card} space-y-3`}>
        <p className="flex items-center gap-2 font-semibold text-surface-900 dark:text-white">
          <Link2 className="h-4 w-4" /> Link previews
        </p>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          When you paste a product link into WhatsApp, Instagram or Facebook, it shows the photo, name and price — like this:
        </p>
        <div className="max-w-sm overflow-hidden rounded-xl border border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800">
          {preview.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.image} alt="" className="aspect-[1.91/1] w-full object-cover" />
          ) : (
            <div className="flex aspect-[1.91/1] items-center justify-center text-sm text-surface-400">No photo</div>
          )}
          <div className="p-3">
            <p className="truncate text-[11px] uppercase tracking-wide text-surface-400">{preview.site}</p>
            <p className="truncate text-sm font-semibold text-surface-900 dark:text-white">{preview.title}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-surface-500 dark:text-surface-400">
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Product pages also carry Google product data (price, stock).</span>
          {preview.url.startsWith("http") && (
            <a href={`https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(preview.url)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-semibold underline">
              Test with Facebook <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
