"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase-client";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, data.email, {
        url: `${window.location.origin}/auth/login`,
      });
    } catch {
      // Never reveal whether the email exists — always show success
    } finally {
      setSentEmail(data.email);
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/">
            <img src="/logo.png" alt="Duka" className="h-10 w-auto object-contain" />
          </Link>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-8">

          {sent ? (
            /* ── Success state ── */
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-950/40 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white mb-2">
                Check your inbox
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mb-2">
                If an account exists for{" "}
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">{sentEmail}</span>,
                you&apos;ll receive a password reset link shortly.
              </p>
              <p className="text-xs text-zinc-400 mb-7">
                Didn&apos;t get it? Check your spam folder, then try again.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setSent(false)}
                  className="w-full py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                >
                  Try a different email
                </button>
                <Link
                  href="/auth/login"
                  className="w-full flex items-center justify-center py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-black font-bold text-sm transition-all"
                >
                  Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <div className="mb-6">
                <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center mb-4">
                  <Mail className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white mb-1">
                  Reset your password
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                  Enter your store email and we&apos;ll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Email address
                  </label>
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="you@example.com"
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 disabled:opacity-60 text-black font-bold py-3.5 rounded-xl text-sm transition-all"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>

              <Link
                href="/auth/login"
                className="flex items-center justify-center gap-1.5 mt-5 text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
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
