"use client";

import { useEffect, useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";

/** Thin amber bar showing how far through the article the reader is. */
export function ReadingProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => {
      const el = document.getElementById("article");
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      setP(Math.max(0, Math.min(1, -r.top / Math.max(1, total))));
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  return <div aria-hidden className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-gradient-to-r from-amber-400 to-orange-500 transition-transform duration-150" style={{ transform: `scaleX(${p})` }} />;
}

/** Table of contents that highlights the section being read. */
export function TocNav({ items }: { items: { id: string; text: string; level: 2 | 3 }[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  useEffect(() => {
    const heads = items.map((i) => document.getElementById(i.id)).filter((x): x is HTMLElement => !!x);
    if (!heads.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-90px 0px -70% 0px" },
    );
    heads.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [items]);
  if (items.length < 2) return null;
  return (
    <nav aria-label="On this page">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>On this page</p>
      <ul className="space-y-1 border-l" style={{ borderColor: "var(--border)" }}>
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              className={`-ml-px block border-l-2 py-1 text-[13px] leading-snug transition-colors ${i.level === 3 ? "pl-6" : "pl-3"} ${active === i.id ? "border-amber-500 font-semibold" : "border-transparent hover:border-zinc-300"}`}
              style={{ color: active === i.id ? "var(--text-primary)" : "var(--text-muted)" }}
            >
              {i.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const ICONS = {
  whatsapp: <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .6l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.4 1.8 2.2 1.2 1.1 2.2 1.4 2.5 1.6.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.1.1.6-.1 1.2z" />,
  x: <path d="M18.2 2.3h3.4l-7.4 8.4 8.7 11.5h-6.8l-5.3-7-6.1 7H1.3l7.9-9L.9 2.3h7l4.8 6.4 5.5-6.4zm-1.2 18h1.9L7 4.2H5z" />,
  facebook: <path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.6-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z" />,
  linkedin: <path d="M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.3V9h3.4v1.6c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.2zM5.3 7.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2zM7.1 20.5H3.5V9h3.6v11.5zM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0z" />,
};

/** Share buttons: WhatsApp first (where Nigerian readers share), then the rest. */
export function ShareBar({ url, title, vertical = false }: { url: string; title: string; vertical?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [canNative, setCanNative] = useState(false);
  useEffect(() => setCanNative(typeof navigator !== "undefined" && "share" in navigator), []);
  const e = encodeURIComponent;
  const links: [keyof typeof ICONS, string, string][] = [
    ["whatsapp", "Share on WhatsApp", `https://wa.me/?text=${e(`${title} ${url}`)}`],
    ["x", "Share on X", `https://x.com/intent/post?text=${e(title)}&url=${e(url)}`],
    ["facebook", "Share on Facebook", `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`],
    ["linkedin", "Share on LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}`],
  ];
  const btn = "grid h-10 w-10 place-items-center rounded-full border transition-colors hover:border-amber-400 hover:text-amber-600";
  return (
    <div className={`flex gap-2 ${vertical ? "flex-col" : "flex-wrap"}`}>
      {links.map(([k, label, href]) => (
        <a key={k} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className={btn} style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>{ICONS[k]}</svg>
        </a>
      ))}
      <button
        type="button"
        aria-label="Copy link"
        title={copied ? "Copied" : "Copy link"}
        onClick={() => { navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }).catch(() => {}); }}
        className={btn}
        style={{ borderColor: "var(--border)", color: copied ? "#16a34a" : "var(--text-secondary)" }}
      >
        {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
      </button>
      {canNative && !vertical && (
        <button type="button" aria-label="Share" onClick={() => navigator.share({ title, url }).catch(() => {})} className={btn} style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
          <Share2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** Counts a read once per visit (the server de-duplicates per day). */
export function ViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    const t = setTimeout(() => {
      fetch("/api/blog/view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }), keepalive: true }).catch(() => {});
    }, 4000);
    return () => clearTimeout(t);
  }, [slug]);
  return null;
}
