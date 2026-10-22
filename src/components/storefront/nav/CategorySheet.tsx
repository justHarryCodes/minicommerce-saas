"use client";

// Bottom sheet of categories for the app-style nav. Loaded only when a
// shopper first opens it (vaul isn't needed to paint the page).
import Link from "next/link";
import Image from "next/image";
import { Drawer } from "vaul";
import type { NavCategory } from "./core";

export default function CategorySheet({ open, onOpenChange, categories, homeHref }: { open: boolean; onOpenChange: (o: boolean) => void; categories: NavCategory[]; homeHref: string }) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col rounded-t-3xl bg-white outline-none dark:bg-surface-900">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-surface-200 dark:bg-surface-700" />
          <Drawer.Title className="px-5 pb-2 pt-4 text-lg font-bold text-surface-900 dark:text-white">Categories</Drawer.Title>
          <div className="grid grid-cols-3 gap-3 overflow-y-auto px-5 pb-8">
            {categories.map((c) => (
              <Link key={c.id} href={`${homeHref}?category=${c.slug}`} onClick={() => onOpenChange(false)} className="flex flex-col items-center gap-2 text-center">
                <span className="relative block aspect-square w-full overflow-hidden bg-surface-100 dark:bg-surface-800" style={{ borderRadius: "var(--sf-radius)" }}>
                  {c.cover ? (
                    <Image src={c.cover} alt="" fill sizes="120px" className="object-cover" />
                  ) : (
                    <span className="sf-display absolute inset-0 flex items-center justify-center text-2xl opacity-40">{c.name.slice(0, 1)}</span>
                  )}
                </span>
                <span className="line-clamp-2 text-xs font-semibold text-surface-800 dark:text-surface-200">{c.name}</span>
              </Link>
            ))}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
