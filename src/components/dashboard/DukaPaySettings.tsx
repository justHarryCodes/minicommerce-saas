"use client";
import { Select } from "@/components/ui/Select";

// Duka Pay payout account: shoppers pay by card, transfer or USSD and
// Paystack settles the store's share straight to this bank account.
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { BadgeCheck, Loader2, Pause, ShieldCheck, Zap } from "lucide-react";
import PayoutTimingNote from "./PayoutTimingNote";

type Status = "active" | "disabled" | "not_connected";
interface Payout {
  status: Status;
  bankCode: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  connectedAt: string | null;
  feePercent: number;
}
interface Bank {
  name: string;
  code: string;
}

const input =
  "w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm";

export default function DukaPaySettings({
  onAccount,
}: {
  /** The verified account also becomes the manual-transfer details */
  onAccount?: (a: { bankName: string; accountNumber: string; accountName: string }) => void;
}) {
  const [payout, setPayout] = useState<Payout | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState(false);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [lookup, setLookup] = useState<{ accountName: string; bankName: string } | null>(null);
  const [busy, setBusy] = useState<"lookup" | "connect" | "pause" | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/duka-pay")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Could not load Duka Pay");
        setPayout(d.data);
        setBanks(d.banks ?? []);
        setBankCode(d.data.bankCode ?? "");
      })
      .catch((e) => setLoadError(e.message));
  }, []);


  // Any edit invalidates a previous lookup
  useEffect(() => setLookup(null), [bankCode, accountNumber]);

  async function call(confirm: boolean) {
    setBusy(confirm ? "connect" : "lookup");
    try {
      const res = await fetch("/api/dashboard/duka-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankCode, accountNumber, confirm }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Something went wrong");
      if (!confirm) {
        setLookup(d);
        return;
      }
      setPayout(d.data);
      setEditing(false);
      onAccount?.({ bankName: d.data.bankName, accountNumber, accountName: d.data.accountName });
      toast.success("Duka Pay is on — shoppers can now pay online");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function pause() {
    if (!confirm("Turn off online payments? Shoppers will only see your other payment options.")) return;
    setBusy("pause");
    try {
      const res = await fetch("/api/dashboard/duka-pay", { method: "DELETE" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Could not pause");
      setPayout(d.data);
      toast.success("Online payments paused");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not pause");
    } finally {
      setBusy(null);
    }
  }

  if (loadError) return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">{loadError}</p>;
  if (!payout) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-surface-200 px-4 py-4 text-sm text-surface-500 dark:border-surface-700">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading Duka Pay…
      </div>
    );
  }

  const active = payout.status === "active";
  const showForm = editing || !active;

  return (
    <div className="rounded-2xl border border-surface-200 p-5 dark:border-surface-700">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-bold text-surface-900 dark:text-white">
            <Zap className="h-4 w-4 text-accent-500" /> Duka Pay
            {active ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">On</span>
            ) : (
              <span className="rounded-full bg-surface-100 px-2 py-0.5 text-[11px] font-bold text-surface-500 dark:bg-surface-800">{payout.status === "disabled" ? "Paused" : "Not set up"}</span>
            )}
          </p>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            Shoppers pay by card, bank transfer or USSD. Paystack sends your money straight to your bank account, usually the next working day.
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-1.5 text-xs text-surface-500 dark:text-surface-400">
        <li className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Payments are confirmed automatically — no screenshots to check</li>
        <li className="flex items-center gap-2"><BadgeCheck className="h-3.5 w-3.5 text-emerald-500" /> Fee: {payout.feePercent}% Duka + Paystack&apos;s standard fee, taken from each successful payment</li>
      </ul>

      <PayoutTimingNote className="mt-4" />

      {active && !editing && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-50 px-4 py-3 dark:bg-surface-800/60">
          <div className="text-sm">
            <p className="font-semibold text-surface-900 dark:text-white">{payout.accountName}</p>
            <p className="text-surface-500">{payout.bankName} · {payout.accountNumber}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(true)} className="rounded-lg border border-surface-200 px-3 py-1.5 text-xs font-semibold text-surface-700 hover:bg-white dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800">
              Change account
            </button>
            <button type="button" onClick={pause} disabled={busy !== null} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-surface-500 hover:text-red-600 disabled:opacity-50">
              {busy === "pause" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />} Pause
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="mt-5 space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300" htmlFor="dp-bank">Bank</label>
            <Select
              id="dp-bank"
              value={bankCode}
              onChange={setBankCode}
              placeholder="Choose your bank…"
              searchable
              searchPlaceholder="Search banks (GTBank, OPay, Moniepoint…)"
              options={banks.map((b) => ({ value: b.code, label: b.name }))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300" htmlFor="dp-acct">Account number</label>
            <input
              id="dp-acct"
              inputMode="numeric"
              maxLength={10}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit account number"
              className={input + " font-mono"}
            />
          </div>

          {lookup ? (
            <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Account found</p>
              <p className="mt-1 text-base font-bold text-surface-900 dark:text-white">{lookup.accountName}</p>
              <p className="text-sm text-surface-500">{lookup.bankName}</p>
              <p className="mt-2 text-xs text-surface-500">Is this your account? Your online sales will be paid here.</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => call(true)} disabled={busy !== null} className="flex items-center gap-2 rounded-xl bg-accent-400 px-4 py-2.5 text-sm font-bold text-black hover:bg-accent-500 disabled:opacity-50">
                  {busy === "connect" && <Loader2 className="h-4 w-4 animate-spin" />} Yes, turn on Duka Pay
                </button>
                <button type="button" onClick={() => setLookup(null)} className="px-3 text-sm font-semibold text-surface-500">Not mine</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => call(false)}
                disabled={busy !== null || !bankCode || accountNumber.length !== 10}
                className="flex items-center gap-2 rounded-xl bg-surface-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40 dark:bg-white dark:text-black"
              >
                {busy === "lookup" && <Loader2 className="h-4 w-4 animate-spin" />} Verify account
              </button>
              {editing && (
                <button type="button" onClick={() => setEditing(false)} className="px-3 text-sm font-semibold text-surface-500">Cancel</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
