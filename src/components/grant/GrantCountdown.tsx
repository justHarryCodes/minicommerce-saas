"use client";

// Days / hours / minutes / seconds until a grant round closes.
import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export default function GrantCountdown({ closesAt, tone = "dark", size = "md" }: { closesAt: string; tone?: "dark" | "light"; size?: "sm" | "md" }) {
  const end = new Date(closesAt).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Before the browser takes over, show the shape without numbers (no hydration mismatch)
  const left = now === null ? null : end - now;
  if (left !== null && left <= 0) {
    return <p className={`text-sm font-semibold ${tone === "dark" ? "text-white/80" : "text-zinc-600"}`}>Applications for this round have closed.</p>;
  }
  const p = left === null ? null : parts(left);
  const box = tone === "dark" ? "bg-white/10 text-white ring-1 ring-white/15" : "bg-white text-zinc-900 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-white dark:ring-zinc-800";
  const num = size === "sm" ? "text-xl" : "text-3xl sm:text-4xl";
  const cell = size === "sm" ? "min-w-[52px] px-2 py-1.5" : "min-w-[64px] px-3 py-2.5 sm:min-w-[76px]";
  return (
    <div className="flex gap-2" role="timer" aria-label="Time left to apply">
      {([["d", "Days"], ["h", "Hours"], ["m", "Mins"], ["s", "Secs"]] as const).map(([k, label]) => (
        <div key={k} className={`rounded-2xl text-center backdrop-blur ${box} ${cell}`}>
          <p className={`font-black tabular-nums leading-none ${num}`}>{p ? String(p[k]).padStart(2, "0") : "--"}</p>
          <p className={`mt-1 text-[10px] font-semibold uppercase tracking-wider ${tone === "dark" ? "text-white/60" : "text-zinc-500"}`}>{label}</p>
        </div>
      ))}
    </div>
  );
}
