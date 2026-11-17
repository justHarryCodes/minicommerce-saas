"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export default function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y rounded-3xl border" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
      {items.map((it, i) => (
        <div key={it.q} style={{ borderColor: "var(--border)" }}>
          <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-bold" style={{ color: "var(--text-primary)" }}>
            {it.q}
            <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`} style={{ color: "var(--text-muted)" }} />
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <p className="px-5 pb-4 text-sm" style={{ color: "var(--text-secondary)" }}>{it.a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
