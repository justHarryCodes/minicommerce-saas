"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Check, Download, Link2, Loader2, Share2, X } from "lucide-react";

// Share a product or the whole store to WhatsApp, Facebook, X, Telegram,
// TikTok / Instagram (link + downloadable card image) or the phone's own
// share sheet. The link preview everywhere is the store's share card
// (/api/og/...), so this shows exactly what people will see.

export interface ShareTarget {
  kind: "product" | "store";
  title: string;
  /** e.g. "₦9,000" */
  price?: string | null;
  /** The public link (store's own domain / subdomain) */
  url: string;
  /** Same-origin path to the share card image */
  cardPath: string;
}

function Brand({ label, bg, children, onClick, href }: { label: string; bg: string; children: React.ReactNode; onClick?: () => void; href?: string }) {
  const inner = (
    <>
      <span className="flex h-12 w-12 items-center justify-center rounded-full text-white shadow-sm" style={{ background: bg }}>
        {children}
      </span>
      <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">{label}</span>
    </>
  );
  const cls = "flex flex-col items-center gap-1.5 rounded-xl p-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800";
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

// Simple brand marks (white on brand colour). Functions, not module-level JSX.
const WA = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3a.4.4 0 0 0 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.5-.3Z" />
  </svg>
);
const FB = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
    <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.5 1.6-1.5h1.7V4.4a22 22 0 0 0-2.5-.1c-2.4 0-4.1 1.5-4.1 4.2v2.3H7.5V14h2.7v8h3.3Z" />
  </svg>
);
const XLOGO = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
    <path d="M17.8 3h3.1l-6.8 7.7 8 10.3h-6.2l-4.9-6.3L5.4 21H2.3l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.3 4.7H5.5l11.2 14.5Z" />
  </svg>
);
const TG = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
    <path d="M21.9 4.3 18.8 19c-.2 1-.8 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-1 .5l.3-4.7 8.6-7.8c.4-.3-.1-.5-.6-.2L7 12 2.4 10.6c-1-.3-1-1 .2-1.5l17.9-6.9c.8-.3 1.6.2 1.4 2.1Z" />
  </svg>
);
const TT = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
    <path d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.8 5.8 0 1 0 5 5.7V9.1a7.4 7.4 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.3-1.6Z" />
  </svg>
);

export default function ShareDialog({ target, onClose }: { target: ShareTarget; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cardOk, setCardOk] = useState(true);
  const [canShareFiles, setCanShareFiles] = useState(false);
  // Fresh card each time the dialog opens (the vendor may have just edited)
  const [card] = useState(() => `${target.cardPath}${target.cardPath.includes("?") ? "&" : "?"}t=${Date.now()}`);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    try {
      setCanShareFiles(!!navigator.canShare?.({ files: [new File([""], "x.jpg", { type: "image/jpeg" })] }));
    } catch {
      setCanShareFiles(false);
    }
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const text = target.kind === "product" ? `${target.title}${target.price ? ` · ${target.price}` : ""}\n${target.url}` : `Shop ${target.title} online 🛍️\n${target.url}`;
  const enc = encodeURIComponent;

  async function copy(msg = "Link copied") {
    await navigator.clipboard.writeText(target.url);
    setCopied(true);
    toast.success(msg);
    setTimeout(() => setCopied(false), 2000);
  }

  async function cardFile(): Promise<File> {
    const res = await fetch(card);
    if (!res.ok) throw new Error("Card not ready");
    const blob = await res.blob();
    const name = `${target.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "duka"}-card.jpg`;
    return new File([blob], name, { type: "image/jpeg" });
  }

  async function download() {
    setBusy(true);
    try {
      const f = await cardFile();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(f);
      a.download = f.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch {
      toast.error("Couldn't download the card. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  // TikTok / Instagram have no web "share link": copy the link (for bio / caption) and save the card to post
  async function forStories(app: string) {
    await copy(`Link copied. Paste it in your ${app} bio or caption`);
    await download();
  }

  async function nativeShare() {
    try {
      if (canShareFiles) {
        const f = await cardFile();
        await navigator.share({ files: [f], title: target.title, text });
      } else {
        await navigator.share({ title: target.title, text, url: target.url });
      }
    } catch {
      /* closed */
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`Share ${target.title}`} onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-xl dark:bg-zinc-900 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-bold text-zinc-900 dark:text-white">Share {target.kind === "store" ? "your store" : "product"}</p>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* What people will see */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
          {cardOk ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card} alt={`Share card for ${target.title}`} width={1200} height={630} className="aspect-[1200/630] w-full bg-zinc-100 object-cover dark:bg-zinc-800" onError={() => setCardOk(false)} />
          ) : (
            <div className="flex aspect-[1200/630] items-center justify-center bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-800">Preview unavailable</div>
          )}
          <p className="truncate border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800">{target.url.replace(/^https?:\/\//, "")}</p>
        </div>
        <p className="mt-2 text-xs text-zinc-500">This card shows up automatically when you paste the link in WhatsApp, Facebook, X, Telegram and more.</p>

        <div className="mt-4 grid grid-cols-4 gap-1 sm:grid-cols-7">
          <Brand label="WhatsApp" bg="#25D366" href={`https://wa.me/?text=${enc(text)}`}><WA /></Brand>
          <Brand label="Facebook" bg="#1877F2" href={`https://www.facebook.com/sharer/sharer.php?u=${enc(target.url)}`}><FB /></Brand>
          <Brand label="X" bg="#000000" href={`https://twitter.com/intent/tweet?text=${enc(target.kind === "product" ? `${target.title}${target.price ? ` · ${target.price}` : ""}` : `Shop ${target.title} online 🛍️`)}&url=${enc(target.url)}`}><XLOGO /></Brand>
          <Brand label="Telegram" bg="#229ED9" href={`https://t.me/share/url?url=${enc(target.url)}&text=${enc(target.title)}`}><TG /></Brand>
          <Brand label="TikTok" bg="#010101" onClick={() => forStories("TikTok")}><TT /></Brand>
          <Brand label="Instagram" bg="linear-gradient(45deg,#f9ce34,#ee2a7b,#6228d7)" onClick={() => forStories("Instagram")}>
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
            </svg>
          </Brand>
          <Brand label={copied ? "Copied" : "Copy link"} bg="#52525b" onClick={() => copy()}>
            {copied ? <Check className="h-5 w-5" /> : <Link2 className="h-5 w-5" />}
          </Brand>
        </div>

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={download} disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download card
          </button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button type="button" onClick={nativeShare} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">
              <Share2 className="h-4 w-4" /> More apps
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
