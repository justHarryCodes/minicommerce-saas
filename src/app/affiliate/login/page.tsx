"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { signInWithEmailAndPassword, getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase-client";

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all";

export default function AffiliateLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Sign in with Firebase
      const cred = await signInWithEmailAndPassword(auth, form.email, form.password);
      const idToken = await getIdToken(cred.user);

      // 2. Exchange for affiliate session cookie
      const res = await fetch("/api/affiliate/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Login failed");
        return;
      }

      router.push("/affiliate/dashboard");
    } catch (err: unknown) {
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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center mx-auto mb-4">
            <span className="text-black font-black text-lg">D</span>
          </div>
          <h1 className="text-2xl font-black text-white">Affiliate Login</h1>
          <p className="text-zinc-400 text-sm mt-1">Sign in to your affiliate account</p>
        </div>

        <form onSubmit={handleSubmit}
          className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">
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
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">
              Password
            </label>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-amber-400 text-black font-black text-sm hover:bg-amber-300 disabled:opacity-50 transition-all mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>Sign in <ArrowRight className="w-4 h-4" /></>
            )}
          </button>

          <p className="text-center text-xs text-zinc-500 pt-2">
            Don&apos;t have an account?{" "}
            <Link href="/affiliate/signup" className="text-amber-400 font-semibold hover:underline">
              Join free
            </Link>
          </p>
        </form>

        <p className="text-center mt-6">
          <Link href="/affiliate" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            ← Back to affiliate program
          </Link>
        </p>
      </div>
    </div>
  );
}
