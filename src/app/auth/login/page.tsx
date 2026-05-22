"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import ReCAPTCHA from "react-google-recaptcha";
import {
  Eye,
  EyeOff,
  Loader2,
  ShoppingBag,
  Star,
  Zap,
  TrendingUp,
} from "lucide-react";
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

const features = [
  { icon: ShoppingBag, text: "Launch your store in minutes" },
  { icon: Zap, text: "Accept payments instantly" },
  { icon: TrendingUp, text: "Track orders & analytics" },
  { icon: Star, text: "Trusted by 1,000+ merchants" },
];

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const idToken = await getIdToken(cred.user);

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Sign in failed");
      }

      const redirectRes = await fetch("/api/auth/redirect");
      const { url } = await redirectRes.json();
      router.push(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("popup-closed-by-user") || msg.includes("cancelled-popup-request")) return;
      toast.error(msg || "Google sign in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  }

  async function onSubmit(data: FormData) {
    const recaptchaToken = recaptchaRef.current?.getValue();
    if (!recaptchaToken) {
      toast.error("Please complete the reCAPTCHA");
      return;
    }

    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, data.email, data.password);
      const idToken = await getIdToken(cred.user);

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, recaptchaToken }),
      });
      if (!res.ok) {
        const resData = await res.json();
        throw new Error(resData.error ?? "Sign in failed");
      }

      const redirectRes = await fetch("/api/auth/redirect");
      const { url } = await redirectRes.json();
      router.push(url);
    } catch (err: unknown) {
      recaptchaRef.current?.reset();
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("invalid-credential") || msg.includes("wrong-password")) {
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
    <div className="min-h-screen flex">
      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-zinc-900 relative overflow-hidden flex-col justify-between p-12">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-400 rounded-full opacity-20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-amber-500 rounded-full opacity-10 blur-3xl" />

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3">
            <img src="/logo.png" alt="Duka" className="h-10 w-auto object-contain" />
            <div>
              <span className="text-white text-xl font-extrabold tracking-tight block leading-none">Duka</span>
              <span className="text-amber-400/70 text-xs font-medium tracking-wider">by Awarizon</span>
            </div>
          </Link>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
              Your store,
              <br />
              <span className="text-amber-400">your rules.</span>
            </h2>
            <p className="text-zinc-400 text-lg leading-relaxed max-w-sm">
              Everything you need to sell online — products, orders, payments, and more.
            </p>
          </div>

          <ul className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-zinc-300 text-sm font-medium">{text}</span>
              </li>
            ))}
          </ul>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-zinc-300 text-sm leading-relaxed mb-3">
              &ldquo;Duka helped me launch my fashion store in a single afternoon. Sales started coming in the same day!&rdquo;
            </p>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-black text-xs font-bold">A</div>
              <div>
                <p className="text-white text-xs font-semibold">Amaka Osei</p>
                <p className="text-zinc-500 text-xs">Fashion & Accessories</p>
              </div>
              <div className="ml-auto flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-zinc-600 text-xs">
          © {new Date().getFullYear()} Duka. All rights reserved.
        </p>
      </div>

      {/* ── Right panel — form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white dark:bg-zinc-950 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8 lg:hidden">
            <Link href="/" className="inline-flex flex-col items-center gap-1">
              <img src="/logo.png" alt="Duka" className="h-10 w-auto object-contain" />
              <span className="text-xs text-zinc-400 font-medium tracking-wider">by Awarizon</span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white mb-2">Welcome back</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Sign in to manage your store</p>
          </div>

          {/* Google sign-in */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold text-sm hover:border-zinc-300 dark:hover:border-zinc-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all mb-5"
          >
            {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
            <span className="text-xs text-zinc-400 font-medium">or sign in with email</span>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Email address
              </label>
              <input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>
              )}
            </div>

            {/* reCAPTCHA */}
            <div className="flex justify-center">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
              />
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl text-sm transition-all shadow-sm hover:shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in to Duka"
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
            <span className="text-xs text-zinc-400 font-medium">New here?</span>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          </div>

          <Link
            href="/auth/signup"
            className="w-full flex items-center justify-center py-3.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-sm hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 transition-all"
          >
            Create a free account
          </Link>
        </div>
      </div>
    </div>
  );
}
