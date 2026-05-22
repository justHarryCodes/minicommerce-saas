"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { z } from "zod";
import { Loader2, ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase-client";

const emailSchema = z.string().email();

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all";

export default function AffiliateForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = emailSchema.safeParse(email.trim());
    if (!result.success) {
      toast.error("Enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim(), {
        url: `${window.location.origin}/affiliate/login`,
      });
    } catch {
      // Never reveal whether the email exists — always show success
    } finally {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/affiliate" className="inline-flex flex-col items-center gap-1">
            <Image
              src="/logo.png"
              alt="Duka"
              width={100}
              height={40}
              className="h-9 w-auto object-contain"
            />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Affiliates
            </span>
          </Link>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-8">

          {sent ? (
            /* ── Success state ── */
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-2">Check your inbox</h1>
              <p className="text-gray-500 text-sm leading-relaxed mb-2">
                If an affiliate account exists for{" "}
                <span className="font-semibold text-gray-700">{email}</span>, you&apos;ll receive
                a password reset link shortly.
              </p>
              <p className="text-xs text-gray-400 mb-7">
                Didn&apos;t get it? Check your spam folder, then try again.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { setSent(false); setEmail(""); }}
                  className="w-full py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Try a different email
                </button>
                <Link
                  href="/affiliate/login"
                  className="w-full flex items-center justify-center py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-sm transition-all"
                >
                  Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <div className="mb-6">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
                  <Mail className="w-5 h-5 text-amber-600" />
                </div>
                <h1 className="text-2xl font-black text-gray-900 mb-1">Reset your password</h1>
                <p className="text-gray-500 text-sm">
                  Enter your affiliate email and we&apos;ll send you a reset link.
                </p>
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-amber-400 text-black font-black text-sm hover:bg-amber-300 disabled:opacity-50 transition-all shadow-sm"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>

              <Link
                href="/affiliate/login"
                className="flex items-center justify-center gap-1.5 mt-5 text-sm font-semibold text-gray-400 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
