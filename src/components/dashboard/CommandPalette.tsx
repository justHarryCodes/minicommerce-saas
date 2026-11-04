"use client";

// ⌘K / Ctrl K: jump to any dashboard page or start a common task.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, ExternalLink, FilePlus2, PackagePlus, ScanBarcode, Search, TicketPlus, type LucideIcon } from "lucide-react";
import { useDashboardDrawer } from "@/lib/dashboard-drawer-store";
import { allowedPath, type Role } from "@/lib/access-shared";
import { NAV_GROUPS } from "./nav-config";

export const NEW_ACTIONS: { href: string; label: string; icon: LucideIcon; keywords: string }[] = [
  { href: "/dashboard/products/new", label: "Add product", icon: PackagePlus, keywords: "new item listing" },
  { href: "/dashboard/pos", label: "New in-store sale", icon: ScanBarcode, keywords: "pos till" },
  { href: "/dashboard/coupons", label: "Create coupon", icon: TicketPlus, keywords: "discount code" },
  { href: "/dashboard/pages", label: "Write a page or post", icon: FilePlus2, keywords: "blog about" },
];

type Entry = { id: string; label: string; group: string; icon: LucideIcon; run: () => void; text: string };

export default function CommandPalette({ role, storeUrl }: { role: Role; storeUrl: string }) {
  const router = useRouter();
  const { paletteOpen: open, setPaletteOpen: setOpen } = useDashboardDrawer();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const entries = useMemo<Entry[]>(() => {
    const go = (href: string) => () => router.push(href);
    const pages = NAV_GROUPS.flatMap((g) =>
      g.items
        .filter((i) => allowedPath(role, i.href))
        .map((i) => ({ id: i.href, label: i.label, group: g.label, icon: i.icon, run: go(i.href), text: `${i.label} ${g.label} ${i.keywords ?? ""}`.toLowerCase() }))
    );
    const acts = NEW_ACTIONS.filter((a) => allowedPath(role, a.href)).map((a) => ({
      id: "act:" + a.label, label: a.label, group: "Actions", icon: a.icon, run: go(a.href), text: `${a.label} ${a.keywords}`.toLowerCase(),
    }));
    const view = { id: "view-store", label: "View my store", group: "Actions", icon: ExternalLink, run: () => window.open(storeUrl, "_blank", "noopener"), text: "view open store website storefront" };
    return [...acts, view, ...pages];
  }, [role, router, storeUrl]);

  const results = useMemo(() => {
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return terms.length ? entries.filter((e) => terms.every((t) => e.text.includes(t))) : entries;
  }, [entries, q]);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);
  useEffect(() => setActive(0), [q]);

  if (!open) return null;

  const run = (e: Entry | undefined) => {
    if (!e) return;
    setOpen(false);
    e.run();
  };
  const onKey = (ev: React.KeyboardEvent) => {
    if (ev.key === "Escape") setOpen(false);
    else if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      const n = results.length;
      if (!n) return;
      const next = ev.key === "ArrowDown" ? (active + 1) % n : (active - 1 + n) % n;
      setActive(next);
      listRef.current?.querySelector(`[data-i="${next}"]`)?.scrollIntoView({ block: "nearest" });
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      run(results[active]);
    }
  };

  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-3 pt-[12vh] backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search the dashboard"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKey}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-center gap-2 border-b border-zinc-100 px-3 dark:border-zinc-800">
          <Search className="h-4 w-4 text-zinc-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Go to a page or start something…"
            className="h-11 flex-1 border-0 bg-transparent p-0 text-sm text-zinc-900 shadow-none outline-none placeholder:text-zinc-400 focus:ring-0 dark:text-white"
            role="combobox"
            aria-expanded="true"
            aria-controls="dash-palette-list"
          />
          <kbd className="rounded border border-zinc-200 px-1.5 text-[10px] text-zinc-400 dark:border-zinc-700">Esc</kbd>
        </div>
        <div ref={listRef} id="dash-palette-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-1">
          {results.length === 0 && <p className="px-3 py-6 text-center text-sm text-zinc-400">Nothing matches &ldquo;{q}&rdquo;</p>}
          {results.map((e, i) => {
            const header = e.group !== lastGroup ? e.group : null;
            lastGroup = e.group;
            return (
              <div key={e.id}>
                {header && <p className="px-2 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">{header}</p>}
                <button
                  data-i={i}
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={() => run(e)}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] ${i === active ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white" : "text-zinc-600 dark:text-zinc-300"}`}
                >
                  <e.icon className="h-4 w-4 shrink-0 text-zinc-400" />
                  <span className="flex-1 truncate">{e.label}</span>
                  {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-zinc-400" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
