"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import {
  Eye,
  EyeOff,
  Loader2,
  ShoppingBag,
  Star,
  Zap,
  TrendingUp,
} from "lucide-react";
import { signInWithEmailAndPassword, getIdToken } from "firebase/auth";
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

export default function LoginPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        data.email,
        data.password,
      );
      const idToken = await getIdToken(cred.user);

      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const redirectRes = await fetch("/api/auth/redirect");
      const { url } = await redirectRes.json();
      router.push(url);
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
        toast.error("Sign in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-zinc-900 relative overflow-hidden flex-col justify-between p-12">
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Gradient blob */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-400 rounded-full opacity-20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-amber-500 rounded-full opacity-10 blur-3xl" />

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-black" />
            </div>
            <span className="text-white text-xl font-extrabold tracking-tight">
              ShopForge
            </span>
          </Link>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
              Your store,
              <br />
              <span className="text-amber-400">your rules.</span>
            </h2>
            <p className="text-zinc-400 text-lg leading-relaxed max-w-sm">
              Everything you need to sell online — products, orders, payments,
              and more.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-zinc-300 text-sm font-medium">
                  {text}
                </span>
              </li>
            ))}
          </ul>

          {/* Testimonial */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-zinc-300 text-sm leading-relaxed mb-3">
              &ldquo;ShopForge helped me launch my fashion store in a single
              afternoon. Sales started coming in the same day!&rdquo;
            </p>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-black text-xs font-bold">
                A
              </div>
              <div>
                <p className="text-white text-xs font-semibold">Amaka Osei</p>
                <p className="text-zinc-500 text-xs">Fashion & Accessories</p>
              </div>
              <div className="ml-auto flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-3 h-3 text-amber-400 fill-amber-400"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-zinc-600 text-xs">
          © {new Date().getFullYear()} ShopForge. All rights reserved.
        </p>
      </div>

      {/* ── Right panel — form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white dark:bg-zinc-950">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-black" />
              </div>
              <span className="font-extrabold text-xl text-zinc-900 dark:text-white">
                ShopForge
              </span>
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white mb-2">
              Welcome back
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              Sign in to manage your store
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
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
                <p className="text-red-500 text-xs mt-1.5">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl text-sm transition-all shadow-sm hover:shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in to ShopForge"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
            <span className="text-xs text-zinc-400 font-medium">New here?</span>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          </div>

          {/* Sign up link */}
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
