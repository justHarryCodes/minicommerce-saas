"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, CheckCircle2, Copy, Loader2, MessageCircle, Pause, Play, Unplug } from "lucide-react";

// Dashboard -> Channels -> WhatsApp shop. Shoppers browse, add to cart and
// check out inside WhatsApp; the vendor connects their number with Meta's
// popup (Embedded Signup). Hidden behind "coming soon" until the platform's
// Meta keys are set.

interface Status {
  available: boolean;
  included: boolean;
  embeddedSignup: { appId: string; configId: string; version: string } | null;
  admin: { missing: string[]; testNumber: boolean } | null;
  connection: { display_name: string | null; display_phone: string | null; status: "active" | "paused" | "error"; token_source: string; connected_at: string; last_error: string | null } | null;
  stats: { chats: number; carts: number; orders: number } | null;
}

declare global {
  interface Window {
    FB?: { init: (o: Record<string, unknown>) => void; login: (cb: (r: { authResponse?: { code?: string } }) => void, o: Record<string, unknown>) => void };
    fbAsyncInit?: () => void;
  }
}

function loadFacebookSdk(appId: string, version: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FB) return resolve();
    window.fbAsyncInit = () => {
      window.FB!.init({ appId, autoLogAppEvents: true, xfbml: false, version });
      resolve();
    };
    const s = document.createElement("script");
    s.src = "https://connect.facebook.net/en_US/sdk.js";
    s.async = true;
    s.defer = true;
    s.crossOrigin = "anonymous";
    s.onerror = () => reject(new Error("Couldn't load Facebook. Check your connection or ad blocker."));
    document.body.appendChild(s);
  });
}

const FEATURES = [
  "Shoppers say hi and get your menu, categories and products with photos and prices",
  "They add to cart in the chat and check out on your store with the cart already filled in",
  "Order updates (confirmed, shipped, delivered) go back to the same chat",
  "Questions for you are passed to your phone as notifications",
];

export default function WhatsAppChannel() {
  const [s, setS] = useState<Status | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const signup = useRef<{ wabaId?: string; phoneNumberId?: string }>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/dashboard/whatsapp").catch(() => null);
    setS(res?.ok ? await res.json() : null);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  // Meta's popup (Embedded Signup v4) reports the chosen account and number by postMessage:
  // FINISH {waba_id, phone_number_id}, FINISH_ONLY_WABA (no number), CANCEL, ERROR
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (!e.origin.endsWith("facebook.com")) return;
      try {
        const d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (d?.type !== "WA_EMBEDDED_SIGNUP") return;
        if (String(d.event).startsWith("FINISH") && d.data) {
          signup.current = { wabaId: d.data.waba_id, phoneNumberId: d.data.phone_number_id };
        } else if (d.event === "ERROR") {
          toast.error(d.data?.error_message ?? "Meta couldn't finish connecting your WhatsApp.");
        }
      } catch {
        /* not ours */
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  async function call(method: string, body?: unknown, label = method) {
    setBusy(label);
    try {
      const res = await fetch("/api/dashboard/whatsapp", { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      await load();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function connect() {
    if (!s?.embeddedSignup) return;
    setBusy("connect");
    try {
      await loadFacebookSdk(s.embeddedSignup.appId, s.embeddedSignup.version);
      const code = await new Promise<string | null>((resolve) =>
        window.FB!.login((r) => resolve(r.authResponse?.code ?? null), {
          config_id: s.embeddedSignup!.configId,
          response_type: "code",
          override_default_response_type: true,
          // v4 (the version selected in the Login for Business configuration)
          extras: { setup: {} },
        }),
      );
      const { wabaId, phoneNumberId } = signup.current;
      if (!code || !wabaId || !phoneNumberId) {
        setBusy(null);
        return toast.error(
          wabaId && !phoneNumberId
            ? "Pick or add a phone number in the popup so shoppers have a number to message."
            : "Connection wasn't finished. Try again and tap Finish on the last step.",
        );
      }
      if (await call("POST", { action: "embedded_signup", code, wabaId, phoneNumberId }, "connect")) toast.success("WhatsApp connected 🎉 Send your number a 'Hi' to try it.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't open Facebook");
      setBusy(null);
    }
  }

  const card = "rounded-2xl border border-surface-100 bg-white p-5 dark:border-surface-800 dark:bg-surface-900";
  const btn = "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50";

  if (!s) {
    return (
      <div className={`${card} flex items-center gap-2 text-sm text-surface-500`}>
        <Loader2 className="h-4 w-4 animate-spin" /> Loading WhatsApp…
      </div>
    );
  }

  const title = (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366] text-white">
        <MessageCircle className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-surface-900 dark:text-white">WhatsApp shop</p>
        <p className="text-sm text-surface-500 dark:text-surface-400">Let customers shop and check out inside WhatsApp.</p>
      </div>
    </div>
  );

  const list = (
    <ul className="mt-4 space-y-1.5">
      {FEATURES.map((f) => (
        <li key={f} className="flex gap-2 text-sm text-surface-700 dark:text-surface-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#25D366]" /> {f}
        </li>
      ))}
    </ul>
  );

  // Not switched on for this deployment yet
  if (!s.available) {
    return (
      <div className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          {title}
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Coming soon</span>
        </div>
        {list}
        {s.admin && (
          <p className="mt-4 rounded-xl bg-surface-50 p-3 text-xs text-surface-500 dark:bg-surface-800">
            <strong>Admin:</strong> add {s.admin.missing.join(", ") || "the Meta keys"} to the server environment to switch this on.
          </p>
        )}
      </div>
    );
  }

  const c = s.connection;
  if (!c) {
    return (
      <div className={card}>
        {title}
        {list}
        <div className="mt-5 flex flex-wrap gap-2">
          {s.embeddedSignup && (
            <button type="button" onClick={connect} disabled={!!busy || !s.included} className={`${btn} bg-[#25D366] text-white hover:bg-[#1ebe5a]`}>
              {busy === "connect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />} Connect WhatsApp
            </button>
          )}
          {s.admin?.testNumber && (
            <button type="button" onClick={() => call("POST", { action: "test_number" }, "test").then((ok) => ok && toast.success("Test number connected"))} disabled={!!busy} className={`${btn} border border-surface-200 text-surface-700 dark:border-surface-700 dark:text-surface-200`}>
              {busy === "test" && <Loader2 className="h-4 w-4 animate-spin" />} Use Meta test number (admin)
            </button>
          )}
        </div>
        {s.embeddedSignup && (
          <p className="mt-3 text-xs text-surface-500">
            You&apos;ll log in with Facebook and pick (or create) a WhatsApp Business account and number. A number already on the WhatsApp Business app can be connected too.
          </p>
        )}
        {!s.embeddedSignup && !s.admin && <p className="mt-3 text-xs text-surface-500">Connecting your own number is opening soon.</p>}
      </div>
    );
  }

  const digits = (c.display_phone ?? "").replace(/\D/g, "");
  const shopLink = digits ? `https://wa.me/${digits}?text=${encodeURIComponent("Hi")}` : null;
  const paused = c.status === "paused";

  return (
    <div className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        {title}
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${paused ? "bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"}`}>
          {paused ? "Paused" : "Live"}
        </span>
      </div>

      <div className="mt-4 rounded-xl bg-surface-50 p-4 dark:bg-surface-800/60">
        <p className="text-sm font-semibold text-surface-900 dark:text-white">{c.display_name ?? "WhatsApp Business"}</p>
        <p className="text-sm text-surface-500">{c.display_phone ?? "Number connected"}</p>
        {c.token_source === "env_test" && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Meta test number: only phone numbers added in the Meta app can message it.</p>}
      </div>

      {c.last_error && (
        <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Meta said: {c.last_error}
        </p>
      )}

      {s.stats && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            ["Chats", s.stats.chats],
            ["Checkouts", s.stats.carts],
            ["Orders", s.stats.orders],
          ].map(([l, n]) => (
            <div key={l} className="rounded-xl border border-surface-100 p-3 dark:border-surface-800">
              <p className="text-lg font-black text-surface-900 dark:text-white">{Number(n).toLocaleString()}</p>
              <p className="text-xs text-surface-500">{l}</p>
            </div>
          ))}
        </div>
      )}

      {shopLink && (
        <div className="mt-4">
          <p className="mb-1.5 text-sm font-medium text-surface-700 dark:text-surface-300">Your WhatsApp shop link: share it on Instagram, TikTok and flyers</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-surface-50 px-2.5 py-2 text-xs text-surface-700 dark:bg-surface-800 dark:text-surface-300">{shopLink}</code>
            <button type="button" onClick={() => navigator.clipboard.writeText(shopLink).then(() => toast.success("Copied"))} className="flex shrink-0 items-center gap-1 rounded-lg border border-surface-200 px-2.5 py-2 text-xs font-semibold text-surface-700 dark:border-surface-700 dark:text-surface-200">
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => call("PATCH", { status: paused ? "active" : "paused" }, "pause")} disabled={!!busy} className={`${btn} border border-surface-200 text-surface-700 dark:border-surface-700 dark:text-surface-200`}>
          {busy === "pause" ? <Loader2 className="h-4 w-4 animate-spin" /> : paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />} {paused ? "Turn on replies" : "Pause replies"}
        </button>
        <button
          type="button"
          onClick={() => confirm("Disconnect WhatsApp? Shoppers' messages will stop getting replies.") && call("DELETE", undefined, "disconnect")}
          disabled={!!busy}
          className={`${btn} text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30`}
        >
          {busy === "disconnect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />} Disconnect
        </button>
      </div>
    </div>
  );
}
