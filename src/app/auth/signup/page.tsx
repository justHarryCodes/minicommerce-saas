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
  CheckCircle2,
  Package,
  Users,
  Globe,
} from "lucide-react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  getIdToken,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "@/lib/firebase-client";

const schema = z
  .object({
    fullName: z.string().min(2, "Full name required"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

const perks = [
  { icon: ShoppingBag, text: "Custom storefront with your branding" },
  { icon: Package, text: "Unlimited products & categories" },
  { icon: Users, text: "Built-in order management" },
  { icon: Globe, text: "Your own store URL — free" },
];

export default function SignupPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [userEmail, setUserEmail] = useState("");

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
      const cred = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password,
      );
      await updateProfile(cred.user, { displayName: data.fullName });
      await sendEmailVerification(cred.user);

      const idToken = await getIdToken(cred.user);
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error("Session creation failed");

      setUserEmail(data.email);
      setVerificationSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Signup failed";
      if (msg.includes("email-already-in-use")) {
        toast.error("An account with this email already exists.");
      } else {
        toast.error(msg || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Verification sent screen ──
  if (verificationSent) {
    return (
      <div className="min-h-screen flex">
        {/* Left panel */}
        <div className="hidden lg:flex lg:w-1/2 bg-zinc-900 relative overflow-hidden flex-col justify-center items-center p-12">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: "40px 40px",
            }}
          />
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-400 rounded-full opacity-20 blur-3xl" />
          <div className="relative z-10 text-center">
            <div className="w-20 h-20 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-10 h-10 text-amber-400" />
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-3">
              Almost there!
            </h2>
            <p className="text-zinc-400 text-lg max-w-xs mx-auto">
              Verify your email to start selling with ShopForge
            </p>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white dark:bg-zinc-950">
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white mb-3">
              Check your inbox
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mb-2">
              We sent a verification link to
            </p>
            <p className="text-zinc-900 dark:text-white font-semibold text-lg mb-8">
              {userEmail}
            </p>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 mb-8 text-left space-y-2">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Next steps:
              </p>
              <ol className="text-sm text-amber-700 dark:text-amber-400 space-y-1.5 list-decimal list-inside">
                <li>Open the email from ShopForge</li>
                <li>Click the verification link</li>
                <li>Come back and set up your store</li>
              </ol>
            </div>

            <button
              onClick={() => router.push("/onboarding")}
              className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-black font-bold text-sm transition-all mb-4"
            >
              Continue to setup →
            </button>

            <p className="text-xs text-zinc-400">
              Didn&apos;t receive it? Check your spam folder or{" "}
              <button
                onClick={async () => {
                  if (auth.currentUser) {
                    await sendEmailVerification(auth.currentUser);
                    toast.success("Verification email resent!");
                  }
                }}
                className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
              >
                resend email
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Signup form ──
  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
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
              Start selling
              <br />
              <span className="text-amber-400">today for free.</span>
            </h2>
            <p className="text-zinc-400 text-lg leading-relaxed max-w-sm">
              Join thousands of merchants already growing their business on
              ShopForge.
            </p>
          </div>

          <ul className="space-y-4">
            {perks.map(({ icon: Icon, text }) => (
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

          {/* Social proof */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {["A", "B", "C", "D"].map((l, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-zinc-900 bg-amber-400 flex items-center justify-center text-black text-xs font-bold"
                >
                  {l}
                </div>
              ))}
            </div>
            <p className="text-zinc-400 text-sm">
              <span className="text-white font-semibold">1,000+</span> merchants
              already onboard
            </p>
          </div>
        </div>

        <p className="relative z-10 text-zinc-600 text-xs">
          © {new Date().getFullYear()} ShopForge. All rights reserved.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white dark:bg-zinc-950 overflow-y-auto">
        <div className="w-full max-w-md py-8">
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

          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white mb-2">
              Create your account
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              Free forever. No credit card required.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full name */}
            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Full name
              </label>
              <input
                {...register("fullName")}
                type="text"
                placeholder="Jane Doe"
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
              />
              {errors.fullName && (
                <p className="text-red-500 text-xs mt-1.5">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Email address
              </label>
              <input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
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
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPw ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
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

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <input
                  {...register("confirmPassword")}
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter your password"
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showConfirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1.5">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl text-sm transition-all shadow-sm hover:shadow-md mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create free account"
              )}
            </button>

            <p className="text-xs text-zinc-400 text-center">
              By signing up you agree to our{" "}
              <Link href="/terms" className="text-amber-600 hover:underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-amber-600 hover:underline">
                Privacy Policy
              </Link>
            </p>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
            <span className="text-xs text-zinc-400 font-medium">
              Have an account?
            </span>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          </div>

          <Link
            href="/auth/login"
            className="w-full flex items-center justify-center py-3.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-sm hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 transition-all"
          >
            Sign in instead
          </Link>
        </div>
      </div>
    </div>
  );
}
