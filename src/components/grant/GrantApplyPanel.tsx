"use client";

// The apply card: a "Start my application" step first, then the form, which
// shows the round's support amount (set by the admin, so it's always current).
import { useState } from "react";
import { ArrowRight, HandCoins } from "lucide-react";
import { naira } from "@/lib/grants-shared";
import GrantApplyForm from "./GrantApplyForm";

export default function GrantApplyPanel({ minProducts, amount, title }: { minProducts: number; amount: number; title: string }) {
  const [started, setStarted] = useState(false);

  if (!started) {
    return (
      <div className="space-y-4">
        <ol className="space-y-3">
          {[
            "Check your store meets every requirement for a properly set-up store.",
            "Fill in your name, Duka login email and store link.",
            "Confirm from your inbox. That's what submits it.",
          ].map((t, i) => (
            <li key={t} className="flex items-start gap-3 text-[15px]" style={{ color: "var(--text-secondary)" }}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-black">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => setStarted(true)} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 text-[15px] font-bold text-black transition hover:bg-amber-500">
          Start my application <ArrowRight className="h-4 w-4" />
        </button>
        <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
          By applying you agree to the <a href="#terms" className="font-semibold underline underline-offset-2">terms and conditions</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 p-4 text-black">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/30">
          <HandCoins className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{title} support</p>
          <p className="text-2xl font-black leading-tight">{naira(amount)}</p>
          <p className="text-xs font-medium opacity-80">for one selected business, plus guidance from the Duka team</p>
        </div>
      </div>
      <GrantApplyForm minProducts={minProducts} />
    </div>
  );
}
