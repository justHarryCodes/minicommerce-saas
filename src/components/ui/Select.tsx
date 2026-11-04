"use client";

// Duka's dropdown. Replaces the browser's <select> so it looks the same
// everywhere and stays readable in light and dark mode.
//  • The list floats in a portal, so tables and cards never clip it, and
//    flips above the button when there's no room below.
//  • It inherits dark mode from wherever the button sits (dashboard or a
//    dark storefront theme).
//  • Keyboard: ↑ ↓ Home End to move, Enter/Space to pick, Esc to close,
//    type a letter to jump. Long lists get a search box.
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  /** Text used for search and type-ahead when `label` isn't a string */
  text?: string;
  /** Small line under the label */
  hint?: string;
  disabled?: boolean;
}

export interface SelectProps<T extends string | number> {
  value: T | null | undefined;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  /** Show a search box (default: when there are more than 10 options) */
  searchable?: boolean;
  searchPlaceholder?: string;
  size?: "sm" | "md";
  disabled?: boolean;
  id?: string;
  name?: string;
  "aria-label"?: string;
  /** Extra classes for the button */
  className?: string;
  /** Icon shown before the selected label */
  icon?: React.ReactNode;
  /** Minimum width of the list (px) */
  menuWidth?: number;
}

const textOf = <T extends string | number>(o: SelectOption<T>) => o.text ?? (typeof o.label === "string" ? o.label : String(o.value));

export function Select<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = "Choose…",
  searchable,
  searchPlaceholder = "Search…",
  size = "md",
  disabled,
  id,
  name,
  className,
  icon,
  menuWidth = 180,
  ...rest
}: SelectProps<T>) {
  const autoId = useId();
  const listId = `${id ?? autoId}-list`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; maxH: number; above: boolean } | null>(null);
  const [dark, setDark] = useState(false);
  const typeahead = useRef({ text: "", at: 0 });

  const withSearch = searchable ?? options.length > 10;
  const selected = options.find((o) => o.value === value) ?? null;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => textOf(o).toLowerCase().includes(q)) : options;
  }, [options, query]);

  const place = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const vh = window.innerHeight;
    const below = vh - r.bottom - 8;
    const above = r.top - 8;
    const want = Math.min(320, 44 + options.length * 36);
    const flip = below < Math.min(want, 200) && above > below;
    const width = Math.max(r.width, menuWidth);
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    setPos({ left, width, above: flip, maxH: Math.max(140, Math.min(320, flip ? above : below)), top: flip ? r.top - 4 : r.bottom + 4 });
  }, [menuWidth, options.length]);

  const openMenu = () => {
    if (disabled) return;
    setDark(!!triggerRef.current?.closest(".dark"));
    setQuery("");
    const i = Math.max(0, options.findIndex((o) => o.value === value));
    setActive(i);
    place();
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };
  const choose = (o: SelectOption<T> | undefined) => {
    if (!o || o.disabled) return;
    if (o.value !== value) onChange(o.value);
    close();
  };

  // Follow the button while scrolling / resizing; close on outside click
  useLayoutEffect(() => {
    if (!open) return;
    const onMove = () => place();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) close(false);
    };
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      document.removeEventListener("mousedown", onDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    if (withSearch) setTimeout(() => searchRef.current?.focus(), 0);
    else setTimeout(() => menuRef.current?.focus(), 0);
  }, [open, withSearch]);
  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    if (open) menuRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const move = (dir: 1 | -1, from = active) => {
    const n = shown.length;
    for (let step = 1; step <= n; step++) {
      const i = (from + dir * step + n) % n;
      if (!shown[i]?.disabled) return setActive(i);
    }
  };

  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Home") { e.preventDefault(); move(1, -1); }
    else if (e.key === "End") { e.preventDefault(); move(-1, shown.length); }
    else if (e.key === "Enter" || (e.key === " " && !withSearch)) { e.preventDefault(); choose(shown[active]); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab") close(false);
    else if (!withSearch && e.key.length === 1 && /\S/.test(e.key)) {
      // type-ahead: jump to the first option starting with what was typed
      const now = Date.now();
      const t = typeahead.current;
      t.text = now - t.at < 700 ? t.text + e.key.toLowerCase() : e.key.toLowerCase();
      t.at = now;
      const i = shown.findIndex((o) => !o.disabled && textOf(o).toLowerCase().startsWith(t.text));
      if (i >= 0) setActive(i);
    }
  };

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      openMenu();
    }
  };

  const h = size === "sm" ? "h-8 text-[13px] px-2.5" : "h-10 text-sm px-3";

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onTriggerKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={rest["aria-label"]}
        className={cn(
          "inline-flex w-full min-w-0 items-center gap-2 rounded-lg border bg-white text-left text-zinc-900 transition-colors",
          "border-zinc-200 hover:border-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400",
          "dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-accent-400 ring-2 ring-accent-400/30 dark:border-accent-500",
          h,
          className,
        )}
      >
        {icon && <span className="shrink-0 text-zinc-400">{icon}</span>}
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-zinc-400")}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-zinc-400 transition-transform", open && "rotate-180")} />
      </button>
      {name && <input type="hidden" name={name} value={value == null ? "" : String(value)} />}

      {open && pos &&
        createPortal(
          <div className={dark ? "dark" : undefined}>
            <div
              ref={menuRef}
              tabIndex={-1}
              onKeyDown={onMenuKey}
              style={{ position: "fixed", left: pos.left, width: pos.width, maxHeight: pos.maxH, ...(pos.above ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}
              className="z-[100] flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white text-zinc-900 shadow-xl outline-none ring-1 ring-black/5 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-white/5"
            >
              {withSearch && (
                <div className="flex shrink-0 items-center gap-2 border-b border-zinc-100 px-2.5 dark:border-zinc-800">
                  <Search className="h-3.5 w-3.5 text-zinc-400" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    aria-label={searchPlaceholder}
                    aria-controls={listId}
                    aria-activedescendant={shown[active] ? `${listId}-${active}` : undefined}
                    className="h-9 w-full border-0 bg-transparent p-0 text-[13px] text-zinc-900 shadow-none outline-none placeholder:text-zinc-400 focus:ring-0 dark:text-zinc-100"
                  />
                </div>
              )}
              <ul id={listId} role="listbox" aria-activedescendant={!withSearch && shown[active] ? `${listId}-${active}` : undefined} className="min-h-0 flex-1 overflow-y-auto p-1">
                {shown.length === 0 && <li className="px-2.5 py-3 text-center text-[13px] text-zinc-400">No matches</li>}
                {shown.map((o, i) => {
                  const sel = o.value === value;
                  return (
                    <li
                      key={String(o.value)}
                      id={`${listId}-${i}`}
                      data-i={i}
                      role="option"
                      aria-selected={sel}
                      aria-disabled={o.disabled || undefined}
                      onMouseMove={() => !o.disabled && setActive(i)}
                      onClick={() => choose(o)}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px]",
                        i === active && !o.disabled && "bg-zinc-100 dark:bg-zinc-800",
                        sel && "font-semibold",
                        o.disabled && "cursor-not-allowed opacity-40",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{o.label}</span>
                        {o.hint && <span className="block truncate text-[11px] font-normal text-zinc-400">{o.hint}</span>}
                      </span>
                      {sel && <Check className="h-3.5 w-3.5 shrink-0 text-accent-600 dark:text-accent-400" />}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default Select;
