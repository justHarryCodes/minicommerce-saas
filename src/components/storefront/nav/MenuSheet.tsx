"use client";

// Slide-out menu used by every nav style on phones (and "All departments").
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, m } from "framer-motion";
import { ChevronRight, Film, Heart, Home, MessageCircle, Package, Phone, X } from "lucide-react";
import { useNav } from "./core";

export default function MenuSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { store, categories, homeHref, storeBase, bookmarkCount, whatsappHref } = useNav();
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const quick = [
    { href: homeHref, label: "All products", icon: Home },
    { href: `${storeBase}/reels`, label: "Reels", icon: Film },
    { href: `${storeBase}/track`, label: "Track order", icon: Package },
  ];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <m.aside
            role="dialog"
            aria-label="Menu"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-white text-surface-900 shadow-2xl dark:bg-surface-900 dark:text-white"
          >
            <div className="flex items-center justify-between border-b border-surface-100 px-5 py-4 dark:border-surface-800">
              {store.logo_url ? (
                <Image src={store.logo_url} alt={store.name} width={140} height={40} className="h-8 w-auto object-contain" />
              ) : (
                <span className="sf-display text-lg">{store.name}</span>
              )}
              <button onClick={onClose} className="rounded-full p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-2">
                {quick.map(({ href, label, icon: Icon }) => (
                  <Link key={label} href={href} onClick={onClose} className="flex items-center gap-2.5 rounded-xl bg-surface-50 px-3 py-3 text-sm font-semibold hover:bg-surface-100 dark:bg-surface-800 dark:hover:bg-surface-700">
                    <Icon className="h-4 w-4" /> {label}
                  </Link>
                ))}
                <a href={`${homeHref}#saved-items`} onClick={onClose} className="flex items-center gap-2.5 rounded-xl bg-surface-50 px-3 py-3 text-sm font-semibold hover:bg-surface-100 dark:bg-surface-800 dark:hover:bg-surface-700">
                  <Heart className="h-4 w-4" /> Saved
                  {bookmarkCount > 0 && (
                    <span className="ml-auto rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: "var(--sf-accent)", color: "var(--sf-on-accent)" }}>
                      {bookmarkCount}
                    </span>
                  )}
                </a>
              </div>

              {categories.length > 0 && (
                <div className="mt-6">
                  <p className="mb-2 px-3 text-sm font-bold">Shop by category</p>
                  {categories.map((cat, i) => {
                    const hasSubs = cat.subcategories.length > 0;
                    const isOpen = expanded === cat.id;
                    return (
                      <m.div key={cat.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + i * 0.03 }}>
                        <div className="flex items-center rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800">
                          <Link href={`${homeHref}?category=${cat.slug}`} onClick={onClose} className="flex flex-1 items-center gap-3 px-3 py-2.5 text-sm font-medium">
                            {cat.cover && <Image src={cat.cover} alt="" width={64} height={64} className="h-8 w-8 rounded-lg object-cover" />}
                            {cat.name}
                          </Link>
                          {hasSubs && (
                            <button onClick={() => setExpanded(isOpen ? null : cat.id)} className="p-3 text-surface-400" aria-expanded={isOpen} aria-label={`${isOpen ? "Collapse" : "Expand"} ${cat.name}`}>
                              <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                            </button>
                          )}
                        </div>
                        {hasSubs && isOpen && (
                          <div className="mb-1 ml-3 border-l border-surface-100 pl-3 dark:border-surface-800">
                            {cat.subcategories.map((sub) => (
                              <Link key={sub.id} href={`${homeHref}?category=${cat.slug}&sub=${sub.slug}`} onClick={onClose} className="block rounded-lg px-3 py-2 text-sm text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-white">
                                {sub.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </m.div>
                    );
                  })}
                </div>
              )}
            </div>
            {(whatsappHref || store.phone) && (
              <div className="border-t border-surface-100 p-5 dark:border-surface-800">
                <p className="mb-3 text-sm font-bold">Need help?</p>
                <div className="flex flex-wrap gap-2">
                  {whatsappHref && (
                    <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white">
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                  )}
                  {store.phone && (
                    <a href={`tel:${store.phone}`} className="flex items-center gap-2 rounded-full bg-surface-100 px-4 py-2 text-sm font-semibold text-surface-800 dark:bg-surface-800 dark:text-surface-200">
                      <Phone className="h-4 w-4" /> Call
                    </a>
                  )}
                </div>
              </div>
            )}
          </m.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
