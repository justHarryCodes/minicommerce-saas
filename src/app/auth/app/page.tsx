"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GoogleAuthProvider, getRedirectResult, signInWithPopup, signInWithRedirect, type User } from "firebase/auth";
import { Loader2, ShieldCheck, Smartphone } from "lucide-react";
import DukaLogo from "@/components/DukaLogo";
import { auth } from "@/lib/firebase-client";

// Google sign-in for the Duka Vendors app (see lib/mobile-auth.ts). The app
// opens this page in a secure in-app browser; after Google sign-in we hand
// the app a one-time code through its own link (duka-vendors://…).

const APP_REDIRECT = /^(duka-vendors|exp\+duka-vendors):\/\/[\w./?=&%-]*$/;

function AppSignIn() {
  const sp = useSearchParams();
  const state = sp.get("state") ?? "";
  const redirect = sp.get("redirect") ?? "";
  const valid = APP_REDIRECT.test(redirect) && /^[\w-]{16,128}$/.test(state);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backLink, setBackLink] = useState<string | null>(null);

  const handOff = useCallback(
    async (user: User) => {
      setBusy(true);
      setError(null);
      try {
        const idToken = await user.getIdToken(true);
        const res = await fetch("/api/mobile/auth/handoff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        const data = (await res.json().catch(() => ({}))) as { code?: string; error?: string };
        if (!res.ok || !data.code) throw new Error(data.error ?? "Couldn't finish signing in");
        const back = `${redirect}${redirect.includes("?") ? "&" : "?"}code=${encodeURIComponent(data.code)}&state=${encodeURIComponent(state)}`;
        setBackLink(back);
        window.location.href = back;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        setBusy(false);
      }
    },
    [redirect, state],
  );

  // Coming back from a redirect-based Google sign-in (used when popups are blocked)
  useEffect(() => {
    if (!valid) return;
    getRedirectResult(auth)
      .then((r) => r?.user && handOff(r.user))
      .catch(() => {});
  }, [valid, handOff]);

  async function google() {
    setBusy(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      const cred = await signInWithPopup(auth, provider);
      await handOff(cred.user);
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
        await signInWithRedirect(auth, provider); // comes back to this page
        return;
      }
      setBusy(false);
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") setError("Google sign-in didn't finish. Please try again.");
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-zinc-50 px-5 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-7 text-center shadow-xl shadow-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex justify-center">
          <DukaLogo href={null} size={40} />
        </div>
        {!valid ? (
          <>
            <h1 className="mt-6 text-xl font-bold text-zinc-900 dark:text-white">Open this from the app</h1>
            <p className="mt-2 text-sm text-zinc-500">This page signs you in to the Duka Vendors app. Start from “Continue with Google” in the app.</p>
          </>
        ) : backLink ? (
          <>
            <h1 className="mt-6 text-xl font-bold text-zinc-900 dark:text-white">You&apos;re signed in</h1>
            <p className="mt-2 text-sm text-zinc-500">Taking you back to the Duka app…</p>
            <a href={backLink} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-black">
              <Smartphone className="h-4 w-4" /> Open the app
            </a>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-xl font-bold text-zinc-900 dark:text-white">Sign in to Duka Vendors</h1>
            <p className="mt-2 text-sm text-zinc-500">Use the Google account for your store.</p>
            <button
              type="button"
              onClick={google}
              disabled={busy}
              className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-900"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
              {busy ? "Signing in…" : "Continue with Google"}
            </button>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-zinc-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure sign-in by Google
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default function AppSignInPage() {
  return (
    <Suspense>
      <AppSignIn />
    </Suspense>
  );
}
