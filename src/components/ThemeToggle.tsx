"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

// Light / Dark / System switch. Two looks:
//   "icon"      one button that cycles (navbars)
//   "segmented" three buttons side by side (menus, settings)

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

export default function ThemeToggle({ variant = "icon", className = "" }: { variant?: "icon" | "segmented"; className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // The saved choice is only known in the browser: render a same-size placeholder first
  const current = mounted ? (theme ?? "light") : "light";

  if (variant === "segmented") {
    return (
      <div role="radiogroup" aria-label="Appearance" className={`inline-flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800 ${className}`}>
        {OPTIONS.map(({ value, label, Icon }) => {
          const on = mounted && current === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setTheme(value)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                on ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-white" : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          );
        })}
      </div>
    );
  }

  const i = OPTIONS.findIndex((o) => o.value === current);
  const next = OPTIONS[(i + 1) % OPTIONS.length];
  // Show what you're looking at (System shows the resolved light/dark icon with a dot)
  const shown = current === "system" ? (resolvedTheme === "dark" ? Moon : Sun) : (OPTIONS[i]?.Icon ?? Sun);
  const Shown = shown;
  return (
    <button
      type="button"
      onClick={() => setTheme(next.value)}
      aria-label={`Appearance: ${OPTIONS[i]?.label ?? "Light"}. Switch to ${next.label}`}
      title={`Appearance: ${OPTIONS[i]?.label ?? "Light"} (click for ${next.label})`}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white ${className}`}
    >
      <Shown className="h-[18px] w-[18px]" />
      {mounted && current === "system" && <span className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" />}
    </button>
  );
}
