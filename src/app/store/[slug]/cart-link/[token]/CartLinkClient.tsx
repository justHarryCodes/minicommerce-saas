"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCart } from "@/components/storefront/CartProvider";
import { useStore } from "@/lib/store-context";
import type { CartItem } from "@/types";
import { socialRefKey } from "@/lib/meta/social-ref";


export default function CartLinkClient({ token, items, dropped }: { token: string; items: CartItem[] | null; dropped: number }) {
  const { clearCart, addItem } = useCart();
  const { storeBase, storeSlug } = useStore();
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !items?.length) return;
    done.current = true;
    clearCart();
    for (const i of items) addItem(i);
    try {
      localStorage.setItem(socialRefKey(storeSlug), token);
    } catch {
      /* the order still goes through, just without chat updates */
    }
    router.replace(`${storeBase}/checkout?utm_source=whatsapp${dropped ? `&dropped=${dropped}` : ""}`);
  }, [items, dropped, token, storeBase, storeSlug, clearCart, addItem, router]);

  if (!items) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-4xl">🛒</p>
        <h1 className="mt-3 text-xl font-bold text-surface-900 dark:text-white">This link has expired</h1>
        <p className="mt-2 text-sm text-surface-500">It may have been used already. Go back to WhatsApp and tap Checkout again, or shop here.</p>
        <Link href={storeBase || "/"} className="mt-6 inline-block rounded-xl bg-surface-900 px-5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-surface-900">
          Continue shopping
        </Link>
      </div>
    );
  }
  if (!items.length) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-4xl">😔</p>
        <h1 className="mt-3 text-xl font-bold text-surface-900 dark:text-white">Those items just sold out</h1>
        <Link href={storeBase || "/"} className="mt-6 inline-block rounded-xl bg-surface-900 px-5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-surface-900">
          See what&apos;s available
        </Link>
      </div>
    );
  }
  return (
    <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-surface-500">
      <Loader2 className="h-4 w-4 animate-spin" /> Getting your cart ready…
    </div>
  );
}
