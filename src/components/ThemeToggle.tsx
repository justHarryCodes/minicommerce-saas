"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

// Light / Dark / System switch. Two looks:
//   "icon"      one button that cycles (navbars)
//   "segmented" three buttons side by side (menus, settings)
//   "switch"    a sun/moon pill with a sliding knob, light <-> dark (phone headers)

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

export default function ThemeToggle({ variant = "icon", className = "" }: { variant?: "icon" | "segmented" | "switch"; className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // The saved choice is only known in the browser: render a same-size placeholder first
  const current = mounted ? (theme ?? "light") : "light";

  if (variant === "switch") {
    const dark = mounted && resolvedTheme === "dark";
    return (
      <button
        type="button"
        role="switch"
        aria-checked={dark}
        aria-label={dark ? "Dark mode is on. Switch to light" : "Light mode is on. Switch to dark"}
        onClick={() => setTheme(dark ? "light" : "dark")}
        className={`relative inline-flex h-9 w-[66px] shrink-0 items-center rounded-full bg-zinc-100 p-1 ring-1 ring-inset ring-zinc-200/80 transition-colors dark:bg-zinc-800 dark:ring-zinc-700 ${className}`}
      >
        <Sun className={`absolute left-[9px] h-4 w-4 transition-opacity ${dark ? "text-zinc-500 opacity-100" : "opacity-0"}`} />
        <Moon className={`absolute right-[9px] h-4 w-4 transition-opacity ${dark ? "opacity-0" : "text-zinc-400 opacity-100"}`} />
        <span
          className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.18)] transition-transform duration-300 ${
            dark ? "translate-x-[30px] bg-zinc-950 text-amber-300 ring-1 ring-zinc-600" : "translate-x-0 bg-white text-amber-500"
          }`}
        >
          {dark ? <Moon className="h-4 w-4" fill="currentColor" /> : <Sun className="h-4 w-4" strokeWidth={2.4} />}
        </span>
      </button>
    );
  }

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
