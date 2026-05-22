"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Eye, EyeOff, CheckCircle2, Mail } from "lucide-react";
import toast from "react-hot-toast";
import ReCAPTCHA from "react-google-recaptcha";
import {
  createUserWithEmailAndPassword,
  getIdToken,
  updateProfile,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase-client";

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all";

const PERKS = [
  "₦2,000 for every active referral",
  "Real-time tracking dashboard",
  "Bank transfer payouts",
  "No cap on earnings",
];

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function AffiliateSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleGoogleSignUp() {
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
        throw new Error(data.error ?? "Sign up failed");
      }
      router.push("/affiliate/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("popup-closed-by-user") || msg.includes("cancelled-popup-request")) return;
      toast.error(msg || "Google sign up failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    const recaptchaToken = recaptchaRef.current?.getValue();
    if (!recaptchaToken) {
      toast.error("Please complete the reCAPTCHA");
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(cred.user, { displayName: form.name });
      const idToken = await getIdToken(cred.user);

      const res = await fetch("/api/affiliate/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, name: form.name, recaptchaToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Signup failed");
        recaptchaRef.current?.reset();
        return;
      }
      // Send verification email — continue URL takes user back to login after verifying
      await sendEmailVerification(cred.user, {
        url: `${window.location.origin}/affiliate/login`,
      });
      setEmailSent(true);
    } catch (err: unknown) {
      recaptchaRef.current?.reset();
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("email-already-in-use")) {
        toast.error("An account with this email already exists.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Check your email</h1>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            We sent a verification link to{" "}
            <span className="font-semibold text-gray-700">{form.email}</span>. Click the link
            in that email to activate your affiliate account.
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left space-y-3 mb-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">What to do next</p>
            {[
              "Open the email from Duka / Firebase",
              "Click \"Verify email address\"",
              "You'll be redirected to the sign-in page",
              "Sign in and start sharing your referral link",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-600">{step}</p>
              </div>
            ))}
          </div>
          <Link
            href="/affiliate/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 text-black font-black text-sm hover:bg-amber-300 transition-all"
          >
            Go to sign in <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-xs text-gray-400 mt-4">
            Didn&apos;t get it? Check your spam folder or{" "}
            <button
              onClick={async () => {
                try {
                  const { auth } = await import("@/lib/firebase-client");
                  if (auth.currentUser) await sendEmailVerification(auth.currentUser, { url: `${window.location.origin}/affiliate/login` });
                  toast.success("Verification email resent!");
                } catch {
                  toast.error("Failed to resend. Please try again.");
                }
              }}
              className="text-amber-600 font-semibold hover:underline"
            >
              resend it
            </button>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex">

      {/* ── Left panel — info ── */}
      <div className="hidden lg:flex flex-col w-[420px] xl:w-[480px] shrink-0 bg-amber-400 p-12 justify-between">
        <div>
          <Link href="/affiliate">
            <Image src="/logo.png" alt="Duka" width={100} height={40} className="h-9 w-auto object-contain mb-2" />
          </Link>
          <p className="text-black/60 text-xs font-semibold uppercase tracking-widest mb-12">Affiliate Program</p>

          <h2 className="text-3xl xl:text-4xl font-black text-black leading-tight mb-4">
            Start earning with<br />every referral.
          </h2>
          <p className="text-black/70 leading-relaxed mb-10">
            Join the Duka affiliate program and earn ₦2,000 for every vendor you bring onto the platform who activates their store.
          </p>

          <div className="space-y-3">
            {PERKS.map((perk) => (
              <div key={perk} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-black/80 shrink-0" />
                <span className="text-black/80 text-sm font-medium">{perk}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-black/10 rounded-2xl p-5">
          <p className="text-black/60 text-xs font-semibold uppercase tracking-widest mb-3">Earnings example</p>
          <div className="space-y-2">
            {[
              ["10 vendors", "₦20,000"],
              ["25 vendors", "₦50,000"],
              ["50 vendors", "₦100,000"],
            ].map(([v, e]) => (
              <div key={v} className="flex justify-between text-sm">
                <span className="text-black/60">{v}</span>
                <span className="font-black text-black">{e}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <Link href="/affiliate">
            <Image src="/logo.png" alt="Duka" width={80} height={32} className="h-7 w-auto object-contain" />
          </Link>
          <Link href="/affiliate/login" className="text-sm font-semibold text-gray-500 hover:text-gray-900">
            Sign in
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-1">Create your account</h1>
              <p className="text-gray-500 text-sm">Free to join. Your link is ready instantly.</p>
            </div>

            {/* Google sign-up */}
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-semibold text-sm hover:border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed transition-all mb-4"
            >
              {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
              Continue with Google
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 font-medium">or sign up with email</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Full name
                </label>
                <input
                  className={inputClass}
                  placeholder="Amaka Johnson"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  required
                  autoFocus
                />
              </div>

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
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <input
                    className={inputClass + " pr-10"}
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 8 characters"
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
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-amber-400 text-black font-black text-sm hover:bg-amber-300 disabled:opacity-50 transition-all shadow-sm mt-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Create account <ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              <p className="text-center text-xs text-gray-500">
                Already have an account?{" "}
                <Link href="/affiliate/login" className="text-amber-600 font-bold hover:underline">
                  Sign in
                </Link>
              </p>
            </form>

            {/* Mobile perks */}
            <div className="lg:hidden mt-8 pt-6 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-3">
                {PERKS.map((perk) => (
                  <div key={perk} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-500">{perk}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
