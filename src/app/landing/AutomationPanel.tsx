"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { Bell, Bot, Check, CreditCard, Package, Receipt, ShoppingBag } from "lucide-react";
import Icon3D from "./Icon3D";

const AUTOMATIONS = [
  { icon: ShoppingBag, title: "Abandoned cart rescue", caption: "Brings back shoppers who didn't pay", msg: "👋 You left something in your cart. Complete your order →" },
  { icon: Bell, title: "Order updates", caption: "Confirmed, shipped, delivered", msg: "📦 Your order DK-4821 has shipped. Track it here →" },
  { icon: Bot, title: "WhatsApp shop bot", caption: "Answers and sells 24/7", msg: "🛍️ Welcome! Browse products, add to cart, checkout here." },
  { icon: Receipt, title: "Receipts & invoices", caption: "Sent for every order", msg: "🧾 Payment received: ₦24,500. Thank you!" },
  { icon: Package, title: "Low stock alerts", caption: "Know before you run out", msg: "⚠️ Only 2 left: Ankara Wrap Dress (M)" },
  { icon: CreditCard, title: "Next-day payouts", caption: "Straight to your bank", msg: "💸 ₦186,000 paid out to your account" },
] as const;

export default function AutomationPanel() {
  const [on, setOn] = useState<boolean[]>(AUTOMATIONS.map(() => true));
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-80px" });
  const reduce = useReducedMotion();

  // Cycle the "live" automation while in view
  useEffect(() => {
    if (!inView || reduce) return;
    const t = setInterval(() => setActive((a) => (a + 1) % AUTOMATIONS.length), 2600);
    return () => clearInterval(t);
  }, [inView, reduce]);

  const a = AUTOMATIONS[active];
  return (
    <div ref={ref} className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {AUTOMATIONS.map((x, i) => {
          const live = i === active && on[i];
          return (
            <button
              key={x.title}
              type="button"
              onClick={() => setActive(i)}
              className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all ${live ? "border-amber-400/70 bg-white/10" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"}`}
            >
              <Icon3D icon={x.icon} tone={live ? "amber" : "slate"} size={36} className="transition-transform duration-300" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-white">{x.title}</span>
                <span className="block truncate text-xs text-white/55">{x.caption}</span>
              </span>
              {/* Toggle */}
              <span
                role="switch"
                aria-checked={on[i]}
                aria-label={`${x.title} ${on[i] ? "on" : "off"}`}
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  setOn((s) => s.map((v, k) => (k === i ? !v : v)));
                }}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    setOn((s) => s.map((v, k) => (k === i ? !v : v)));
                  }
                }}
                className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${on[i] ? "bg-emerald-500" : "bg-white/20"}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on[i] ? "left-[18px]" : "left-0.5"}`} />
              </span>
            </button>
          );
        })}
      </div>
      {/* What it just did */}
      <div className="flex h-14 items-center rounded-2xl border border-white/10 bg-black/30 px-4">
        <AnimatePresence mode="wait">
          <motion.p
            key={`${active}-${on[active]}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 truncate text-sm text-white/85"
          >
            {on[active] ? (
              <>
                <Check className="h-4 w-4 shrink-0 text-emerald-400" /> <span className="truncate">{a.msg}</span>
              </>
            ) : (
              <span className="text-white/50">Paused. Flip it back on and Duka handles it for you.</span>
            )}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
