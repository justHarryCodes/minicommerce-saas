"use client";

import { useState } from "react";
import { HelpCircle, X, Lightbulb, Info, AlertTriangle } from "lucide-react";

type Variant = "info" | "tip" | "warning";

const STYLES: Record<Variant, { bg: string; border: string; color: string; icon: typeof Info }> = {
  info:    { bg: "#3b82f615", border: "#3b82f630", color: "#3b82f6", icon: Info },
  tip:     { bg: "#f59e0b15", border: "#f59e0b30", color: "#d97706", icon: Lightbulb },
  warning: { bg: "#ef444415", border: "#ef444430", color: "#dc2626", icon: AlertTriangle },
};

/* ── Inline dismissable banner ── */
export function Tip({
  children,
  variant = "tip",
  id,
}: {
  children: React.ReactNode;
  variant?: Variant;
  id?: string; // if supplied, remembers dismissal in localStorage
}) {
  const lsKey = id ? `sf_tip_${id}` : null;
  const [dismissed, setDismissed] = useState(() =>
    lsKey ? (typeof window !== "undefined" && localStorage.getItem(lsKey) === "1") : false
  );

  if (dismissed) return null;

  const { bg, border, color, icon: Icon } = STYLES[variant];

  return (
    <div
      className="flex gap-3 rounded-xl px-4 py-3.5 text-sm leading-relaxed"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <Icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color }} />
      <div className="flex-1" style={{ color }}>{children}</div>
      {lsKey && (
        <button
          onClick={() => { localStorage.setItem(lsKey, "1"); setDismissed(true); }}
          className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
          style={{ color }}
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/* ── Small inline ? icon with popover ── */
export function InfoTip({ content }: { content: string }) {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative inline-flex shrink-0"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <HelpCircle className="w-3.5 h-3.5 cursor-help text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors" />
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 z-50 text-xs rounded-xl px-3 py-2.5 shadow-xl leading-relaxed pointer-events-none bg-surface-900 dark:bg-surface-100 text-white dark:text-surface-900">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-900 dark:border-t-surface-100" />
        </div>
      )}
    </div>
  );
}
