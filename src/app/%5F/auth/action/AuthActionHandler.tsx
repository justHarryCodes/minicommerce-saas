"use client";

// Handles every Firebase email action on Duka's own domain:
//   verifyEmail          → confirm the address
//   resetPassword        → choose a new password
//   verifyAndChangeEmail → confirm a new email (from Settings → Account email)
//   recoverEmail         → undo an email change someone else made
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  sendPasswordResetEmail,
  signOut,
  verifyPasswordResetCode,
} from "firebase/auth";
import { AlertTriangle, Check, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, MailCheck, ShieldAlert, X } from "lucide-react";
import { auth } from "@/lib/firebase-client";
import { authActionError, parseAuthAction, passwordProblems, type AuthAction } from "@/lib/auth-action";

type View =
  | { kind: "working"; text: string }
  | { kind: "reset"; email: string }
  | { kind: "done"; icon: "mail" | "key" | "shield"; title: string; text: React.ReactNode; cta: { href: string; label: string }; extra?: React.ReactNode }
  | { kind: "error"; title: string; text: string };

const errCode = (e: unknown) => (e as { code?: string })?.code;

export default function AuthActionHandler() {
  const params = useSearchParams();
  const started = useRef(false);
  const [action, setAction] = useState<AuthAction | null>(null);
  const [view, setView] = useState<View>({ kind: "working", text: "Checking your link…" });

  useEffect(() => {
    if (started.current) return; // a link code works once — never run twice
    started.current = true;
    const a = parseAuthAction(new URLSearchParams(params.toString()), window.location.origin);
    setAction(a);
    void run(a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInHref = (a: AuthAction) => a.continueUrl ?? "/auth/login";

  async function run(a: AuthAction) {
    if (!a.mode || !a.oobCode) {
      setView({ kind: "error", title: "This link is incomplete", text: "Open the newest email from Duka and tap the button in it again, or request a new link." });
      return;
    }
    try {
      switch (a.mode) {
        case "verifyEmail": {
          await applyActionCode(auth, a.oobCode);
          await auth.currentUser?.reload().catch(() => {});
          setView({
            kind: "done",
            icon: "mail",
            title: "Email verified",
            text: "Thanks — your email address is confirmed. You can now sign in and use your account.",
            cta: { href: signInHref(a), label: "Continue" },
          });
          break;
        }
        case "resetPassword": {
          const email = await verifyPasswordResetCode(auth, a.oobCode);
          setView({ kind: "reset", email });
          break;
        }
        case "verifyAndChangeEmail": {
          const info = await checkActionCode(auth, a.oobCode);
          await applyActionCode(auth, a.oobCode);
          // Firebase signs the account out everywhere after an email change
          await signOut(auth).catch(() => {});
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
          setView({
            kind: "done",
            icon: "mail",
            title: "Email address changed",
            text: (
              <>
                Your account now uses <strong className="text-zinc-900 dark:text-white">{info.data.email}</strong>. Sign in again with your new email.
              </>
            ),
            cta: { href: "/auth/login", label: "Sign in" },
          });
          break;
        }
        case "recoverEmail": {
          const info = await checkActionCode(auth, a.oobCode);
          const restored = info.data.email ?? "";
          await applyActionCode(auth, a.oobCode);
          await signOut(auth).catch(() => {});
          setView({
            kind: "done",
            icon: "shield",
            title: "Email change undone",
            text: (
              <>
                Your sign-in email is back to <strong className="text-zinc-900 dark:text-white">{restored}</strong>. If you didn&apos;t ask for the change, reset your password now to keep your store safe.
              </>
            ),
            cta: { href: "/auth/login", label: "Sign in" },
            extra: restored ? <ResetLinkButton email={restored} /> : null,
          });
          break;
        }
        default:
          setView({ kind: "error", title: "This link isn't used on Duka", text: "Sign in with your email and password, or with Google." });
      }
    } catch (e) {
      setView({ kind: "error", title: "We couldn't use this link", text: authActionError(errCode(e)) });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Image src="/logo.png" alt="Duka" width={120} height={40} className="h-10 w-auto object-contain" priority />
          </Link>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {view.kind === "working" && (
            <div className="flex flex-col items-center py-6 text-center">
              <Loader2 className="mb-4 h-7 w-7 animate-spin text-amber-500" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{view.text}</p>
            </div>
          )}

          {view.kind === "reset" && action?.oobCode && (
            <ResetPasswordForm
              email={view.email}
              oobCode={action.oobCode}
              onDone={() =>
                setView({
                  kind: "done",
                  icon: "key",
                  title: "Password updated",
                  text: "Your new password is set. Sign in with it to get back to your store.",
                  cta: { href: signInHref(action), label: "Sign in" },
                })
              }
              onError={(code) => setView({ kind: "error", title: "We couldn't change your password", text: authActionError(code) })}
            />
          )}

          {view.kind === "done" && (
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-950/40">
                {view.icon === "shield" ? (
                  <ShieldAlert className="h-7 w-7 text-green-600 dark:text-green-400" />
                ) : view.icon === "key" ? (
                  <KeyRound className="h-7 w-7 text-green-600 dark:text-green-400" />
                ) : (
                  <MailCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                )}
              </div>
              <h1 className="mb-2 text-2xl font-extrabold text-zinc-900 dark:text-white">{view.title}</h1>
              <p className="mb-7 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{view.text}</p>
              <div className="flex flex-col gap-3">
                <a href={view.cta.href} className="flex w-full items-center justify-center rounded-xl bg-amber-400 py-3 text-sm font-bold text-black transition-all hover:bg-amber-500">
                  {view.cta.label}
                </a>
                {view.extra}
              </div>
            </div>
          )}

          {view.kind === "error" && (
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/40">
                <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="mb-2 text-2xl font-extrabold text-zinc-900 dark:text-white">{view.title}</h1>
              <p className="mb-7 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{view.text}</p>
              <div className="flex flex-col gap-3">
                <Link href="/auth/forgot-password" className="flex w-full items-center justify-center rounded-xl border border-zinc-200 py-3 text-sm font-semibold text-zinc-700 transition-all hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                  Request a new password link
                </Link>
                <Link href="/auth/login" className="flex w-full items-center justify-center rounded-xl bg-amber-400 py-3 text-sm font-bold text-black transition-all hover:bg-amber-500">
                  Go to sign in
                </Link>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Need help? <a href="mailto:support@dukanigeria.com" className="font-semibold underline underline-offset-2">support@dukanigeria.com</a>
        </p>
      </div>
    </div>
  );
}

function ResetPasswordForm({ email, oobCode, onDone, onError }: { email: string; oobCode: string; onDone: () => void; onError: (code?: string) => void }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const problems = passwordProblems(pw);
  const mismatch = confirm.length > 0 && confirm !== pw;
  const ready = problems.length === 0 && confirm === pw;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setSaving(true);
    try {
      await confirmPasswordReset(auth, oobCode, pw);
      onDone();
    } catch (err) {
      onError(errCode(err));
    } finally {
      setSaving(false);
    }
  }

  const input =
    "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 pr-11 text-sm text-zinc-900 placeholder-zinc-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white";

  return (
    <>
      <div className="mb-6">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/30">
          <KeyRound className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="mb-1 text-2xl font-extrabold text-zinc-900 dark:text-white">Choose a new password</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          For <span className="font-semibold text-zinc-700 dark:text-zinc-300">{email}</span>
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {/* lets password managers save the new password against this account */}
        <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />
        <div>
          <label htmlFor="new-password" className="mb-1.5 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">New password</label>
          <div className="relative">
            <input id="new-password" type={show ? "text" : "password"} autoComplete="new-password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} className={input} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <ul className="mt-2 space-y-1 text-xs">
            {(["at least 8 characters", "a letter", "a number"] as const).map((rule) => {
              const ok = pw.length > 0 && !problems.includes(rule);
              return (
                <li key={rule} className={`flex items-center gap-1.5 ${ok ? "text-green-600 dark:text-green-400" : "text-zinc-400"}`}>
                  {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />} Contains {rule}
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">Confirm new password</label>
          <input id="confirm-password" type={show ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
          {mismatch && <p className="mt-1.5 text-xs text-red-500">The passwords don&apos;t match.</p>}
        </div>
        <button
          type="submit"
          disabled={!ready || saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3.5 text-sm font-bold text-black transition-all hover:bg-amber-500 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            "Save new password"
          )}
        </button>
      </form>
    </>
  );
}

/** After undoing an email change: send a reset link to the restored address. */
function ResetLinkButton({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  return (
    <button
      type="button"
      disabled={state !== "idle"}
      onClick={async () => {
        setState("sending");
        try {
          await sendPasswordResetEmail(auth, email, { url: `${window.location.origin}/auth/login` });
        } catch {
          /* never reveal anything about the account */
        }
        setState("sent");
      }}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 py-3 text-sm font-semibold text-zinc-700 transition-all hover:bg-zinc-50 disabled:opacity-70 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {state === "sending" && <Loader2 className="h-4 w-4 animate-spin" />}
      {state === "sent" ? (
        <>
          <CheckCircle2 className="h-4 w-4 text-green-600" /> Reset link sent to {email}
        </>
      ) : (
        "Send me a password reset link"
      )}
    </button>
  );
}
