"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  href: string;
  cta: string;
}

const STORAGE_KEY = "duka_onboarding_checklist_dismissed";

interface Props {
  items: ChecklistItem[];
  storeUrl: string;
}

// Derived-state checklist — nothing here is stored on the store itself, it's
// all computed from data that already exists (see dashboard/page.tsx), so it
// can never drift out of sync with reality. Dismissible like TutorialBanner;
// auto-hides once every item is complete since there's nothing left to nudge.
export default function OnboardingChecklist({ items, storeUrl }: Props) {
  const [dismissed, setDismissed] = useState(true); // default hidden until we've checked localStorage, avoids a flash

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length;

  if (dismissed || allDone) return null;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  }

  function copyStoreLink() {
    navigator.clipboard.writeText(storeUrl).then(
      () => toast.success("Store link copied!"),
      () => toast.error("Couldn't copy — copy it from the address bar instead")
    );
  }

  return (
    <div className="relative rounded-2xl bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800 p-5">
      <button
        onClick={dismiss}
        aria-label="Dismiss checklist"
        className="absolute top-4 right-4 text-surface-300 hover:text-surface-500 dark:hover:text-surface-300"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center justify-between mb-1 pr-6">
        <h3 className="font-semibold text-surface-900 dark:text-white">
          Get your store ready
        </h3>
        <span className="text-xs font-medium text-surface-400">
          {doneCount}/{items.length}
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-surface-100 dark:bg-surface-800 mb-4 overflow-hidden">
        <div
          className="h-full bg-accent-400 transition-all duration-500"
          style={{ width: `${(doneCount / items.length) * 100}%` }}
        />
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            {item.done ? (
              <div className="flex items-center gap-2.5 py-1.5 text-sm text-surface-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="line-through">{item.label}</span>
              </div>
            ) : item.id === "share" ? (
              <button
                onClick={copyStoreLink}
                className="flex items-center gap-2.5 py-1.5 text-sm text-surface-700 dark:text-surface-300 hover:text-accent-600 dark:hover:text-accent-400 w-full text-left group"
              >
                <Circle className="w-4 h-4 text-surface-300 shrink-0" />
                <span className="flex-1">{item.label}</span>
                <span className="text-xs font-medium text-accent-600 dark:text-accent-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  {item.cta} <ArrowRight className="w-3 h-3" />
                </span>
              </button>
            ) : (
              <Link
                href={item.href}
                className="flex items-center gap-2.5 py-1.5 text-sm text-surface-700 dark:text-surface-300 hover:text-accent-600 dark:hover:text-accent-400 group"
              >
                <Circle className="w-4 h-4 text-surface-300 shrink-0" />
                <span className="flex-1">{item.label}</span>
                <span className="text-xs font-medium text-accent-600 dark:text-accent-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  {item.cta} <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
