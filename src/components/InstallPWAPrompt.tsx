"use client";

import { useEffect, useState } from "react";
import { X, Share, PlusSquare, Download } from "lucide-react";

const DISMISSED_KEY = "duka_install_prompt_dismissed_at";
const DISMISS_SNOOZE_DAYS = 14;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari's own (non-standard, but the only signal it exposes)
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    return daysSince < DISMISS_SNOOZE_DAYS;
  } catch {
    return false;
  }
}

function dismiss(setVisible: (v: boolean) => void) {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {}
  setVisible(false);
}

/** Site-wide "install this app" banner. Android/Chrome/Edge get a real
 *  native install prompt via beforeinstallprompt; iOS Safari exposes no
 *  such API at all (an Apple platform restriction, not something any web
 *  app can work around), so those visitors get manual Share-sheet
 *  instructions instead. Never shown if already installed or recently
 *  dismissed. */
export function InstallPWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return;

    if (isIOS()) {
      setShowIOSInstructions(true);
      setVisible(true);
      return;
    }

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  if (!visible) return null;

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 rounded-2xl border shadow-lg p-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
      <button
        onClick={() => dismiss(setVisible)}
        aria-label="Dismiss"
        className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
      >
        <X className="w-4 h-4" />
      </button>

      {showIOSInstructions ? (
        <div className="pr-6">
          <p className="font-semibold text-sm text-zinc-900 dark:text-white mb-2">Install Duka on your iPhone</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Tap <Share className="w-3.5 h-3.5 inline -mt-0.5" aria-label="Share" /> in Safari&apos;s toolbar, then
            scroll down and tap <PlusSquare className="w-3.5 h-3.5 inline -mt-0.5" aria-label="Add to Home Screen" />{" "}
            <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
          </p>
        </div>
      ) : (
        <div className="pr-6">
          <p className="font-semibold text-sm text-zinc-900 dark:text-white mb-2">Install the Duka app</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
            Add Duka to your home screen for a faster, full-screen experience.
          </p>
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-black bg-amber-400 hover:bg-amber-500 transition-all"
          >
            <Download className="w-4 h-4" />
            Install
          </button>
        </div>
      )}
    </div>
  );
}
