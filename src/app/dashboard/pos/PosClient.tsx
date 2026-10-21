"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Banknote, CheckCircle2, CreditCard, Gift, Loader2, Minus, PackageOpen, Plus, Printer, Search, Smartphone, Trash2, X } from "lucide-react";
import { clThumb } from "@/lib/cloudinary";
import { formatCurrency } from "@/lib/utils";
import { computeTotals } from "@/lib/order-pricing";
import { cashChange, quickCashAmounts } from "@/lib/pos-shared";

export interface PosProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  image: string | null;
  categoryId: string | null;
  hidden: boolean;
  sku: string | null;
  sizes: { label: string; stock: number; price: number | null; sku: string | null }[] | null;
}

interface Line {
  key: string;
  productId: string;
  name: string;
  size: string | null;
  price: number;
  quantity: number;
  max: number;
  image: string | null;
}

type Pay = "cash" | "transfer" | "card_terminal";

const PAY: { id: Pay; label: string; icon: typeof Banknote }[] = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "transfer", label: "Transfer", icon: Smartphone },
  { id: "card_terminal", label: "Card (POS)", icon: CreditCard },
];

export default function PosClient({
  storeName,
  products,
  categories,
  canDiscount,
}: {
  storeName: string;
  products: PosProduct[];
  categories: { id: string; name: string }[];
  canDiscount: boolean;
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [picking, setPicking] = useState<PosProduct | null>(null);
  const [pay, setPay] = useState<Pay>("cash");
  const [tendered, setTendered] = useState("");
  const [discount, setDiscount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [giftInput, setGiftInput] = useState("");
  const [gift, setGift] = useState<{ code: string; balance: number } | null>(null);
  const [checkingGift, setCheckingGift] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ orderNumber: string; total: number; change: number; receiptUrl: string; giftCard: number } | null>(null);
  // Stock we've sold this session — keeps the grid honest without a reload
  const [sold, setSold] = useState<Record<string, number>>({});

  const stockOf = (p: PosProduct, size?: string | null) => {
    const base = size ? p.sizes?.find((s) => s.label === size)?.stock ?? 0 : p.stock;
    return base - (sold[`${p.id}|${size ?? ""}`] ?? 0);
  };

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!cat || p.categoryId === cat) &&
        (!q || p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q))
    );
  }, [products, search, cat]);

  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const totals = computeTotals({
    subtotal,
    discount: canDiscount ? Number(discount) || 0 : 0,
    deliveryFee: 0,
    payOnDelivery: false,
    depositPercent: 0,
    giftCardBalance: gift?.balance ?? 0,
  });
  const change = pay === "cash" ? cashChange(Number(tendered) || 0, totals.total) : null;
  const count = lines.reduce((s, l) => s + l.quantity, 0);

  function add(p: PosProduct, size: string | null = null) {
    if (p.sizes && !size) {
      setPicking(p);
      return;
    }
    const key = `${p.id}|${size ?? ""}`;
    const max = stockOf(p, size);
    const price = size ? p.sizes?.find((s) => s.label === size)?.price ?? p.price : p.price;
    setLines((cur) => {
      const existing = cur.find((l) => l.key === key);
      const inCart = existing?.quantity ?? 0;
      if (inCart + 1 > max) {
        toast.error(max <= 0 ? "Out of stock" : `Only ${max} in stock`);
        return cur;
      }
      if (existing) return cur.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l));
      return [...cur, { key, productId: p.id, name: p.name, size, price, quantity: 1, max, image: p.image }];
    });
    setPicking(null);
  }

  function setQty(key: string, q: number) {
    setLines((cur) => cur.flatMap((l) => (l.key !== key ? [l] : q <= 0 ? [] : [{ ...l, quantity: Math.min(q, l.max) }])));
  }

  // Enter in the search box: exact SKU (variant or product) adds straight to the sale — works with USB barcode scanners
  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const q = search.trim().toLowerCase();
    if (!q) return;
    for (const p of products) {
      const v = p.sizes?.find((s) => s.sku?.toLowerCase() === q);
      if (v) {
        add(p, v.label);
        setSearch("");
        return;
      }
    }
    if (shown.length === 1) {
      add(shown[0]);
      setSearch("");
    }
  }

  async function applyGift() {
    if (!giftInput.trim()) return;
    setCheckingGift(true);
    const res = await fetch(`/api/dashboard/gift-cards/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: giftInput }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setCheckingGift(false);
    if (!res?.ok) return toast.error(data?.error ?? "Couldn't check that card");
    setGift(data);
  }

  async function charge() {
    if (!lines.length) return;
    if (pay === "cash" && totals.total > 0 && tendered && (Number(tendered) || 0) < totals.total) {
      return toast.error("Cash received is less than the total");
    }
    setBusy(true);
    const res = await fetch("/api/dashboard/pos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, size: l.size })),
        paymentMethod: pay,
        discount: canDiscount ? Math.round(Number(discount) || 0) : 0,
        giftCardCode: gift?.code ?? null,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) return toast.error(data?.error ?? "Sale failed — nothing was charged");

    setSold((cur) => {
      const next = { ...cur };
      for (const l of lines) next[l.key] = (next[l.key] ?? 0) + l.quantity;
      return next;
    });
    setDone({
      orderNumber: data.orderNumber,
      total: data.totals.total,
      giftCard: data.totals.giftCard,
      change: pay === "cash" ? cashChange(Number(tendered) || data.totals.total, data.totals.total) ?? 0 : 0,
      receiptUrl: data.receiptUrl,
    });
  }

  function newSale() {
    setLines([]);
    setTendered("");
    setDiscount("");
    setCustomerName("");
    setCustomerPhone("");
    setGift(null);
    setGiftInput("");
    setDone(null);
    setPay("cash");
    router.refresh();
    setTimeout(() => searchRef.current?.focus(), 50);
  }

  const panel = "rounded-2xl border border-surface-100 bg-white dark:border-surface-800 dark:bg-surface-900";

  return (
    <div className="mx-auto grid max-w-7xl gap-4 pt-4 lg:grid-cols-[1fr_380px] lg:pt-0">
      {/* Products */}
      <section className="min-w-0 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Point of sale</h1>
          <span className="text-xs text-surface-500 dark:text-surface-400">{storeName} · shares stock with your online store</span>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            ref={searchRef}
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder="Search or scan a barcode / SKU"
            className="w-full rounded-xl border border-surface-200 bg-white py-3 pl-10 pr-3.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-accent-400 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
          />
        </div>
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[{ id: null as string | null, name: "All" }, ...categories].map((c) => (
              <button
                key={c.id ?? "all"}
                type="button"
                onClick={() => setCat(c.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${
                  cat === c.id ? "bg-surface-900 text-white dark:bg-white dark:text-black" : "bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {shown.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-surface-200 py-16 text-center text-sm text-surface-500 dark:border-surface-700">No products match.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
            {shown.map((p) => {
              const stock = p.sizes ? p.sizes.reduce((s, v) => s + stockOf(p, v.label), 0) : stockOf(p);
              const out = stock <= 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={out}
                  onClick={() => add(p)}
                  className={`${panel} group overflow-hidden text-left transition-shadow hover:shadow-md disabled:cursor-not-allowed disabled:opacity-45`}
                >
                  <div className="relative aspect-square bg-surface-100 dark:bg-surface-800">
                    {p.image ? (
                      <Image src={clThumb(p.image)} alt="" fill sizes="(min-width: 1280px) 200px, (min-width: 640px) 30vw, 45vw" className="object-cover" />
                    ) : (
                      <PackageOpen className="absolute inset-0 m-auto h-8 w-8 text-surface-300" />
                    )}
                    {p.hidden && <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">Hidden online</span>}
                  </div>
                  <div className="p-2.5">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug text-surface-900 dark:text-white">{p.name}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-surface-900 dark:text-white">{formatCurrency(p.price)}</span>
                      <span className={`text-[11px] font-medium ${out ? "text-red-500" : stock <= 3 ? "text-amber-600" : "text-surface-400"}`}>{out ? "Sold out" : `${stock} left`}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Sale */}
      <aside className={`${panel} flex flex-col lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]`}>
        {done ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <CheckCircle2 className="h-14 w-14 text-emerald-500" />
            <p className="mt-3 text-lg font-bold text-surface-900 dark:text-white">Sale complete</p>
            <p className="font-mono text-sm text-surface-500">{done.orderNumber}</p>
            <p className="mt-4 text-3xl font-black text-surface-900 dark:text-white">{formatCurrency(done.total)}</p>
            {done.giftCard > 0 && <p className="text-xs text-surface-500">+ {formatCurrency(done.giftCard)} on gift card</p>}
            {done.change > 0 && (
              <p className="mt-3 rounded-xl bg-amber-50 px-4 py-2 text-base font-bold text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                Change: {formatCurrency(done.change)}
              </p>
            )}
            <div className="mt-6 flex w-full flex-col gap-2">
              <a href={done.receiptUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-surface-200 py-3 text-sm font-semibold text-surface-800 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-100 dark:hover:bg-surface-800">
                <Printer className="h-4 w-4" /> Receipt
              </a>
              <button type="button" onClick={newSale} className="rounded-xl bg-accent-400 py-3 text-sm font-bold text-black hover:bg-accent-500">
                New sale
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-surface-100 px-4 py-3 dark:border-surface-800">
              <p className="font-semibold text-surface-900 dark:text-white">Current sale {count > 0 && <span className="text-surface-400">· {count} item{count === 1 ? "" : "s"}</span>}</p>
              {lines.length > 0 && (
                <button type="button" onClick={() => setLines([])} className="text-xs font-semibold text-red-600 hover:underline">Clear</button>
              )}
            </div>

            <ul className="min-h-[120px] flex-1 divide-y divide-surface-50 overflow-y-auto dark:divide-surface-800/60">
              {lines.length === 0 && <li className="px-4 py-10 text-center text-sm text-surface-400">Tap products to add them</li>}
              {lines.map((l) => (
                <li key={l.key} className="flex items-center gap-2 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-surface-900 dark:text-white">{l.name}</p>
                    <p className="text-xs text-surface-500 dark:text-surface-400">
                      {l.size ? `${l.size} · ` : ""}
                      {formatCurrency(l.price)}
                    </p>
                  </div>
                  <div className="flex items-center rounded-lg border border-surface-200 dark:border-surface-700">
                    <button type="button" onClick={() => setQty(l.key, l.quantity - 1)} aria-label="One less" className="p-1.5 text-surface-500 hover:text-surface-900 dark:hover:text-white">
                      {l.quantity === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                    </button>
                    <span className="w-7 text-center text-sm font-semibold text-surface-900 dark:text-white">{l.quantity}</span>
                    <button type="button" onClick={() => (l.quantity < l.max ? setQty(l.key, l.quantity + 1) : toast.error(`Only ${l.max} in stock`))} aria-label="One more" className="p-1.5 text-surface-500 hover:text-surface-900 dark:hover:text-white">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="w-20 text-right text-sm font-bold text-surface-900 dark:text-white">{formatCurrency(l.price * l.quantity)}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-3 border-t border-surface-100 p-4 dark:border-surface-800">
              <div className="grid grid-cols-2 gap-2">
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer (optional)" className="rounded-lg border border-surface-200 bg-transparent px-2.5 py-2 text-xs text-surface-900 dark:border-surface-700 dark:text-white" />
                <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Phone (optional)" inputMode="tel" className="rounded-lg border border-surface-200 bg-transparent px-2.5 py-2 text-xs text-surface-900 dark:border-surface-700 dark:text-white" />
              </div>
              <div className="flex gap-2">
                {canDiscount && (
                  <input type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="Discount ₦" className="w-28 rounded-lg border border-surface-200 bg-transparent px-2.5 py-2 text-xs text-surface-900 dark:border-surface-700 dark:text-white" />
                )}
                {gift ? (
                  <span className="flex flex-1 items-center justify-between gap-1 rounded-lg bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <span className="truncate"><Gift className="mr-1 inline h-3.5 w-3.5" />{formatCurrency(gift.balance)} card</span>
                    <button type="button" onClick={() => setGift(null)} aria-label="Remove gift card"><X className="h-3.5 w-3.5" /></button>
                  </span>
                ) : (
                  <span className="flex flex-1 gap-1">
                    <input value={giftInput} onChange={(e) => setGiftInput(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && applyGift()} placeholder="Gift card code" className="min-w-0 flex-1 rounded-lg border border-surface-200 bg-transparent px-2.5 py-2 font-mono text-xs text-surface-900 dark:border-surface-700 dark:text-white" />
                    <button type="button" onClick={applyGift} disabled={checkingGift || !giftInput.trim()} className="rounded-lg border border-surface-200 px-2 text-xs font-semibold text-surface-700 disabled:opacity-40 dark:border-surface-700 dark:text-surface-200">
                      {checkingGift ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                    </button>
                  </span>
                )}
              </div>

              <dl className="space-y-1 text-sm">
                <div className="flex justify-between text-surface-500 dark:text-surface-400"><dt>Subtotal</dt><dd>{formatCurrency(totals.subtotal)}</dd></div>
                {totals.discount > 0 && <div className="flex justify-between text-emerald-600 dark:text-emerald-400"><dt>Discount</dt><dd>−{formatCurrency(totals.discount)}</dd></div>}
                {totals.giftCard > 0 && <div className="flex justify-between text-emerald-600 dark:text-emerald-400"><dt>Gift card</dt><dd>−{formatCurrency(totals.giftCard)}</dd></div>}
                <div className="flex justify-between pt-1 text-xl font-black text-surface-900 dark:text-white"><dt>To pay</dt><dd>{formatCurrency(totals.total)}</dd></div>
              </dl>

              {totals.total > 0 && (
                <div className="grid grid-cols-3 gap-1.5">
                  {PAY.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPay(id)}
                      className={`flex flex-col items-center gap-1 rounded-xl border py-2 text-xs font-semibold ${
                        pay === id ? "border-accent-400 bg-accent-50 text-surface-900 dark:border-accent-500 dark:bg-accent-900/20 dark:text-white" : "border-surface-200 text-surface-600 dark:border-surface-700 dark:text-surface-300"
                      }`}
                    >
                      <Icon className="h-4 w-4" /> {label}
                    </button>
                  ))}
                </div>
              )}

              {pay === "cash" && totals.total > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} inputMode="numeric" value={tendered} onChange={(e) => setTendered(e.target.value)} placeholder="Cash received" className="min-w-0 flex-1 rounded-lg border border-surface-200 bg-transparent px-2.5 py-2 text-sm text-surface-900 dark:border-surface-700 dark:text-white" />
                    {change != null && Number(tendered) > 0 && (
                      <span className={`text-sm font-bold ${change < 0 ? "text-red-500" : "text-surface-900 dark:text-white"}`}>
                        {change < 0 ? `Short ${formatCurrency(-change)}` : `Change ${formatCurrency(change)}`}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {quickCashAmounts(totals.total).map((a) => (
                      <button key={a} type="button" onClick={() => setTendered(String(a))} className="rounded-md bg-surface-100 px-2 py-1 text-[11px] font-semibold text-surface-700 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-200">
                        {formatCurrency(a)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={charge}
                disabled={busy || lines.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-400 py-3.5 text-base font-black text-black hover:bg-accent-500 disabled:opacity-40"
              >
                {busy && <Loader2 className="h-5 w-5 animate-spin" />}
                {totals.total === 0 && lines.length ? "Complete sale" : `Charge ${formatCurrency(totals.total)}`}
              </button>
            </div>
          </>
        )}
      </aside>

      {/* Variant picker */}
      {picking && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => setPicking(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 dark:bg-surface-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold text-surface-900 dark:text-white">{picking.name}</p>
              <button type="button" onClick={() => setPicking(null)} aria-label="Close" className="rounded-lg p-1 text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(picking.sizes ?? []).map((v) => {
                const left = stockOf(picking, v.label);
                return (
                  <button
                    key={v.label}
                    type="button"
                    disabled={left <= 0}
                    onClick={() => add(picking, v.label)}
                    className="rounded-xl border border-surface-200 px-3 py-2.5 text-left hover:border-accent-400 disabled:opacity-40 dark:border-surface-700"
                  >
                    <span className="block text-sm font-semibold text-surface-900 dark:text-white">{v.label}</span>
                    <span className="text-xs text-surface-500">{formatCurrency(v.price ?? picking.price)} · {left > 0 ? `${left} left` : "sold out"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
