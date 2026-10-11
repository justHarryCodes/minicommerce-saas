"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { safeNext } from "@/lib/safe-redirect";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  getIdToken,
} from "firebase/auth";
import { auth } from "@/lib/firebase-client";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormData = z.infer<typeof schema>;

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

export default function AccountLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

// useSearchParams() requires a Suspense boundary during static generation —
// split into its own component so the wrapper above can provide one.
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicitNext = safeNext(searchParams.get("next"));
  const next = explicitNext || "/account";
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function afterAuth(idToken: string) {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Sign in failed");
    }
    // Explicit ?next= (e.g. bounced from checkout) wins; otherwise route by
    // role — admins to the dashboard, customers to their account.
    let dest = next;
    if (!explicitNext) {
      const r = await fetch("/api/auth/redirect")
        .then((x) => x.json())
        .catch(() => null);
      if (r?.url) dest = r.url;
    }
    router.push(dest);
    router.refresh();
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const idToken = await getIdToken(cred.user);
      await afterAuth(idToken);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (
        msg.includes("popup-closed-by-user") ||
        msg.includes("cancelled-popup-request")
      )
        return;
      toast.error(msg || "Google sign in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  }

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        data.email,
        data.password,
      );
      const idToken = await getIdToken(cred.user);
      await afterAuth(idToken);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (
        msg.includes("invalid-credential") ||
        msg.includes("wrong-password")
      ) {
        toast.error("Invalid email or password");
      } else if (msg.includes("user-not-found")) {
        toast.error("No account found with this email");
      } else {
        toast.error(msg || "Sign in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="mb-8 text-center">
        <h1
          className="text-2xl font-black"
          style={{ color: "var(--text-primary)" }}
        >
          Sign in
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Track orders and check out faster next time.
        </p>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading || loading}
        className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border-2 font-semibold text-sm disabled:opacity-60 transition-all mb-5"
        style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
      >
        {googleLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        Continue with Google
      </button>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        <span
          className="text-xs font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          or sign in with email
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label
            className="block text-sm font-semibold mb-1.5"
            style={{ color: "var(--text-primary)" }}
          >
            Email address
          </label>
          <input
            {...register("email")}
            type="email"
            placeholder="you@example.com"
            autoFocus
            className="w-full px-4 py-3 rounded-xl border bg-transparent text-sm focus:outline-none focus:ring-2"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1.5">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              className="block text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-xs font-medium hover:underline"
              style={{ color: "var(--accent)" }}
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              {...register("password")}
              type={showPw ? "text" : "password"}
              placeholder="••••••••"
              className="w-full px-4 py-3 pr-11 rounded-xl border bg-transparent text-sm focus:outline-none focus:ring-2"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-muted)" }}
            >
              {showPw ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-xs mt-1.5">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl text-sm transition-all disabled:opacity-60"
          style={{ background: "var(--accent)" }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <p
        className="text-center text-sm mt-6"
        style={{ color: "var(--text-secondary)" }}
      >
        New here?{" "}
        <Link
          href={`/account/signup?next=${encodeURIComponent(next)}`}
          className="font-semibold hover:underline"
          style={{ color: "var(--accent)" }}
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
