"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  subjectType: "vendor" | "admin";
  /** Render style — "icon" for a header bell, "banner" for a fuller prompt card. */
  variant?: "icon" | "banner";
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/** Bell/banner to enable or disable Web Push for the current vendor or
 *  admin. Mounted in the dashboard and admin layouts respectively — never
 *  on the public storefront, push is a vendor/admin tool here, not a
 *  customer-facing feature. */
export function PushNotificationPrompt({ subjectType, variant = "icon" }: Props) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(ok);
    if (!ok) return;
    setPermission(Notification.permission);

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, []);

  async function enable() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      toast.error("Notifications aren't configured yet.");
      return;
    }

    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        if (perm === "denied") toast.error("Notifications blocked — enable them in your browser's site settings.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectType, subscription: subscription.toJSON() }),
      });
      if (!res.ok) throw new Error("Failed to save subscription");

      setSubscribed(true);
      toast.success("Notifications enabled");
    } catch {
      toast.error("Couldn't enable notifications — please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Notifications disabled");
    } catch {
      toast.error("Couldn't disable notifications.");
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return null;

  if (variant === "icon") {
    return (
      <button
        onClick={subscribed ? disable : enable}
        disabled={loading}
        title={subscribed ? "Disable notifications" : "Enable notifications"}
        aria-label={subscribed ? "Disable notifications" : "Enable notifications"}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-all disabled:opacity-50"
      >
        {subscribed ? <Bell className="w-4.5 h-4.5" /> : <BellOff className="w-4.5 h-4.5" />}
      </button>
    );
  }

  if (subscribed) return null; // banner variant only nags until enabled

  return (
    <div className="rounded-2xl border p-4 flex items-center justify-between gap-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">Turn on notifications</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {subjectType === "vendor" ? "Get notified the moment a new order comes in." : "Get notified when a payment needs your review."}
          </p>
        </div>
      </div>
      <button
        onClick={enable}
        disabled={loading}
        className="px-4 py-2 rounded-xl text-sm font-semibold text-black bg-amber-400 hover:bg-amber-500 transition-all disabled:opacity-50 shrink-0"
      >
        Enable
      </button>
    </div>
  );
}
