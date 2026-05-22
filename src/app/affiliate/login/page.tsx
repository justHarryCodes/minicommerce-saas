"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Eye, EyeOff, MailWarning } from "lucide-react";
import toast from "react-hot-toast";
import ReCAPTCHA from "react-google-recaptcha";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  getIdToken,
  sendEmailVerification,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase-client";

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function AffiliateLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState<User | null>(null);
  const [resending, setResending] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleResend = async () => {
    if (!unverifiedUser) return;
    setResending(true);
    try {
      await sendEmailVerification(unverifiedUser, {
        url: `${window.location.origin}/affiliate/login`,
      });
      toast.success("Verification email sent! Check your inbox.");
    } catch {
      toast.error("Failed to resend. Please try again shortly.");
    } finally {
      setResending(false);
    }
  };

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const idToken = await getIdToken(cred.user);

      const res = await fetch("/api/affiliate/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Sign in failed");
      }
      router.push("/affiliate/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("popup-closed-by-user") || msg.includes("cancelled-popup-request")) return;
      toast.error(msg || "Google sign in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const recaptchaToken = recaptchaRef.current?.getValue();
    if (!recaptchaToken) {
      toast.error("Please complete the reCAPTCHA");
      return;
    }

    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, form.email, form.password);

      if (!cred.user.emailVerified) {
        setUnverifiedUser(cred.user);
        toast.error("Please verify your email before signing in.");
        recaptchaRef.current?.reset();
        return;
      }

      const idToken = await getIdToken(cred.user);

      const res = await fetch("/api/affiliate/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, recaptchaToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Login failed");
        recaptchaRef.current?.reset();
        return;
      }
      router.push("/affiliate/dashboard");
    } catch (err: unknown) {
      recaptchaRef.current?.reset();
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("invalid-credential") || msg.includes("wrong-password")) {
        toast.error("Invalid email or password");
      } else if (msg.includes("user-not-found")) {
        toast.error("No account found with this email");
      } else {
        toast.error("Sign in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/affiliate" className="inline-flex flex-col items-center gap-1">
            <Image src="/logo.png" alt="Duka" width={100} height={40} className="h-9 w-auto object-contain" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Affiliates</span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-black text-gray-900 mb-1">Welcome back</h1>
            <p className="text-gray-500 text-sm">Sign in to your affiliate dashboard</p>
          </div>

          {unverifiedUser && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
              <MailWarning className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800 mb-1">Email not verified</p>
                <p className="text-xs text-amber-700 mb-2 leading-relaxed">
                  Check your inbox for the verification link we sent when you signed up.
                </p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-xs font-bold text-amber-700 hover:underline disabled:opacity-50"
                >
                  {resending ? "Sending…" : "Resend verification email"}
                </button>
              </div>
            </div>
          )}

          {/* Google sign-in */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-semibold text-sm hover:border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed transition-all mb-4"
          >
            {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-medium">or sign in with email</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
                Email address
              </label>
              <input
                className={inputClass}
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Password
                </label>
                <Link href="/affiliate/forgot-password" className="text-xs text-amber-600 font-semibold hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  className={inputClass + " pr-10"}
                  type={showPassword ? "text" : "password"}
                  placeholder="Your password"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* reCAPTCHA */}
            <div className="flex justify-center pt-1">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
              />
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-amber-400 text-black font-black text-sm hover:bg-amber-300 disabled:opacity-50 transition-all shadow-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Sign in <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            <p className="text-center text-xs text-gray-500 pt-1">
              Don&apos;t have an account?{" "}
              <Link href="/affiliate/signup" className="text-amber-600 font-bold hover:underline">
                Join free
              </Link>
            </p>
          </form>
        </div>

        <p className="text-center mt-6">
          <Link href="/affiliate" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            ← Back to affiliate program
          </Link>
        </p>
      </div>
    </div>
  );
}
