"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createUserWithEmailAndPassword, updateProfile, getIdToken } from "firebase/auth";
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

export default function SignupPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await updateProfile(cred.user, { displayName: data.fullName });
      const idToken = await getIdToken(cred.user);

      // Create session cookie
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error("Session creation failed");

      toast.success("Account created! Let's set up your store.");
      router.push("/onboarding");
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

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent-400 flex items-center justify-center text-xl font-black text-black">
              S
            </div>
            <span className="font-bold text-xl text-surface-900 dark:text-white">ShopForge</span>
          </Link>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Create your account</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1 text-sm">
            Start selling online in minutes
          </p>
        </div>

        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-8 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {[
              { label: "Full name", name: "fullName", type: "text", placeholder: "Jane Doe" },
              { label: "Email address", name: "email", type: "email", placeholder: "jane@example.com" },
            ].map(({ label, name, type, placeholder }) => (
              <div key={name}>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  {label}
                </label>
                <input
                  {...register(name as keyof FormData)}
                  type={type}
                  placeholder={placeholder}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400 transition-all"
                />
                {errors[name as keyof FormData] && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors[name as keyof FormData]?.message}
                  </p>
                )}
              </div>
            ))}

            {["password", "confirmPassword"].map((name) => (
              <div key={name}>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  {name === "password" ? "Password" : "Confirm password"}
                </label>
                <div className="relative">
                  <input
                    {...register(name as keyof FormData)}
                    type={showPw ? "text" : "password"}
                    placeholder={name === "password" ? "Min. 8 characters" : "Re-enter password"}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400 transition-all"
                  />
                  {name === "password" && (
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                {errors[name as keyof FormData] && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors[name as keyof FormData]?.message}
                  </p>
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-accent-400 hover:bg-accent-500 disabled:opacity-60 text-black font-bold py-3 rounded-lg text-sm transition-all"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-surface-500 dark:text-surface-400 mt-6">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-semibold text-accent-600 dark:text-accent-400 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
