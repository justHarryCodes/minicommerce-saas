"use client";

// "Get the Duka app" strip at the top of the dashboard. Closing it is
// remembered on this device. Not shown inside the app itself (Android
// WebView) or on iPhone/iPad, where Google Play doesn't apply.
import { useEffect, useState } from "react";
import { Bell, Package, X } from "lucide-react";
import GooglePlayBadge, { PlayLogo, PLAY_STORE_URL } from "@/components/GooglePlayBadge";

const STORAGE_KEY = "duka_app_banner_dismissed";

function shouldShow(): boolean {
  try {
    if (localStorage.getItem(STORAGE_KEY) === "1") return false;
  } catch {
    /* storage blocked: still show */
  }
  const ua = navigator.userAgent;
  if (/; wv\)|DukaVendor/i.test(ua)) return false; // inside the app
  if (/iPhone|iPad|iPod/i.test(ua)) return false;
  return true;
}

export default function AppBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(shouldShow()), []);

  if (!visible) return null;

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  return (
    <div className="mb-3 mt-1 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:mt-0">
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800"
        aria-hidden
        tabIndex={-1}
      >
        <PlayLogo className="h-5 w-5" />
      </a>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-zinc-900 dark:text-white">Duka is on your phone too</p>
        <p className="mt-0.5 hidden text-xs text-zinc-500 dark:text-zinc-400 sm:flex sm:flex-wrap sm:items-center sm:gap-x-3">
          <span className="inline-flex items-center gap-1">
            <Bell className="h-3 w-3" /> Instant order alerts
          </span>
          <span className="inline-flex items-center gap-1">
            <Package className="h-3 w-3" /> Add products and confirm payments on the go
          </span>
        </p>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 sm:hidden">Get order alerts and manage your store anywhere.</p>
      </div>
      <GooglePlayBadge size="sm" className="hidden sm:inline-flex" />
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-bold text-white dark:bg-white dark:text-zinc-900 sm:hidden"
      >
        Install
      </a>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Close app banner"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
