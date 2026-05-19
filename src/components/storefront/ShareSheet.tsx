"use client";

import { useState } from "react";
import { X, Link2, Check } from "lucide-react";

interface Props {
  url: string;
  title?: string | null;
  onClose: () => void;
}

export default function ShareSheet({ url, title, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const text = title ? `${title} — ${url}` : url;

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function shareInstagram() {
    copyLink();
  }

  function shareTikTok() {
    copyLink();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-t-2xl p-5 pb-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-zinc-900 dark:text-white">Share</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-5">
          {/* WhatsApp */}
          <button
            onClick={shareWhatsApp}
            className="flex flex-col items-center gap-1.5"
          >
            <span className="w-14 h-14 rounded-2xl bg-green-500 flex items-center justify-center text-2xl shadow-sm">
              💬
            </span>
            <span className="text-xs text-zinc-600 dark:text-zinc-400">WhatsApp</span>
          </button>

          {/* Instagram */}
          <button
            onClick={shareInstagram}
            className="flex flex-col items-center gap-1.5"
          >
            <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center text-2xl shadow-sm">
              📸
            </span>
            <span className="text-xs text-zinc-600 dark:text-zinc-400">Instagram</span>
          </button>

          {/* TikTok */}
          <button
            onClick={shareTikTok}
            className="flex flex-col items-center gap-1.5"
          >
            <span className="w-14 h-14 rounded-2xl bg-black dark:bg-zinc-800 flex items-center justify-center text-2xl shadow-sm">
              🎵
            </span>
            <span className="text-xs text-zinc-600 dark:text-zinc-400">TikTok</span>
          </button>

          {/* Copy link */}
          <button
            onClick={copyLink}
            className="flex flex-col items-center gap-1.5"
          >
            <span className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shadow-sm">
              {copied ? (
                <Check className="w-6 h-6 text-green-500" />
              ) : (
                <Link2 className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
              )}
            </span>
            <span className="text-xs text-zinc-600 dark:text-zinc-400">
              {copied ? "Copied!" : "Copy link"}
            </span>
          </button>
        </div>

        {/* Instagram / TikTok note */}
        {copied && (
          <p className="text-xs text-center text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 rounded-xl px-3 py-2">
            Link copied! Paste it in Instagram or TikTok to share.
          </p>
        )}

        {/* URL preview */}
        <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl px-3 py-2">
          <Link2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{url}</span>
        </div>
      </div>
    </div>
  );
}
