import Image from "next/image";
import {
  BarChart3,
  Bell,
  Check,
  ChevronRight,
  CreditCard,
  Home,
  Landmark,
  Package,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Star,
  Truck,
  Users,
} from "lucide-react";
import DukaLogo from "@/components/DukaLogo";
import { Browser, Phone, StatusBar } from "../Frames";
import { PRODUCTS, naira } from "../media";

// Static product screens for the landing page. They're drawn in code
// rather than pasted as images, so they stay sharp on every screen and
// match the real product. Decorative: hidden from screen readers.

/* ───────────── Storefront (phone) ───────────── */
export function StorefrontScreen({ className = "" }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <Phone className="aspect-[9/19] w-full">
        <div className="flex h-full flex-col bg-white">
          <StatusBar />
          <div className="flex items-center justify-between px-4 pb-2 pt-1">
            <span className="text-[13px] font-black tracking-tight text-zinc-900">ADAEZE<span className="text-rose-500">.</span></span>
            <span className="flex items-center gap-3 text-zinc-700">
              <Search className="h-4 w-4" />
              <span className="relative">
                <ShoppingBag className="h-4 w-4" />
                <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white">2</span>
              </span>
            </span>
          </div>
          <div className="relative mx-3 overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 p-4 text-white">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">New in</p>
            <p className="mt-1 text-[19px] font-black leading-tight">The Owambe<br />Edit</p>
            <span className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-[10px] font-bold text-rose-600">Shop now</span>
            <div className="absolute -bottom-6 -right-4 h-28 w-28 overflow-hidden rounded-full border-4 border-white/30">
              <Image src={PRODUCTS[0].img} alt="" fill sizes="120px" className="object-cover" />
            </div>
          </div>
          <div className="flex gap-1.5 overflow-hidden px-3 py-3 text-[10px] font-semibold">
            {["All", "Bags", "Beauty", "Fashion", "Tech"].map((c, i) => (
              <span key={c} className={`shrink-0 rounded-full px-2.5 py-1 ${i === 0 ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"}`}>{c}</span>
            ))}
          </div>
          <div className="grid flex-1 grid-cols-2 gap-2.5 overflow-hidden px-3">
            {PRODUCTS.slice(0, 4).map((p) => (
              <div key={p.name}>
                <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100">
                  <Image src={p.img} alt="" fill sizes="140px" className="object-cover" />
                  {p.was && <span className="absolute left-1.5 top-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[8px] font-bold text-white">SALE</span>}
                </div>
                <p className="mt-1 truncate text-[10.5px] font-semibold text-zinc-800">{p.name}</p>
                <p className="text-[11px] font-black text-zinc-900">{naira(p.price)}</p>
              </div>
            ))}
          </div>
          <div className="mx-3 mb-4 mt-2 flex items-center justify-between rounded-full bg-zinc-900 px-4 py-2.5 text-[11px] font-bold text-white">
            <span>View cart · 2 items</span>
            <span>{naira(PRODUCTS[0].price + PRODUCTS[1].price)}</span>
          </div>
        </div>
      </Phone>
    </div>
  );
}

/* ───────────── Checkout (phone) ───────────── */
export function CheckoutScreen({ className = "" }: { className?: string }) {
  const item = PRODUCTS[0];
  const delivery = 2500;
  const methods = [
    { icon: CreditCard, label: "Card", on: true },
    { icon: Landmark, label: "Bank transfer" },
    { icon: Smartphone, label: "USSD" },
    { icon: Truck, label: "Pay on delivery" },
  ];
  return (
    <div className={className} aria-hidden>
      <Phone className="aspect-[9/19] w-full">
        <div className="flex h-full flex-col bg-zinc-50">
          <div className="bg-white">
            <StatusBar />
            <p className="border-b border-zinc-100 px-4 pb-2.5 pt-1 text-center text-[13px] font-bold text-zinc-900">Checkout</p>
          </div>
          <div className="flex-1 space-y-2 overflow-hidden px-3 py-2.5">
            <div className="flex items-center gap-2.5 rounded-xl bg-white p-2.5 shadow-sm">
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                <Image src={item.img} alt="" fill sizes="48px" className="object-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11.5px] font-bold text-zinc-900">{item.name}</span>
                <span className="block text-[10.5px] text-zinc-500">Qty 1</span>
              </span>
              <span className="text-[11.5px] font-black text-zinc-900">{naira(item.price)}</span>
            </div>
            <div className="rounded-xl bg-white p-2.5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Deliver to</p>
              <p className="mt-0.5 text-[11.5px] font-semibold text-zinc-900">12 Admiralty Way, Lekki Phase 1</p>
              <p className="text-[10.5px] text-emerald-600">Arrives tomorrow · {naira(delivery)}</p>
            </div>
            <div className="space-y-1.5 rounded-xl bg-white p-2.5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Pay with</p>
              {methods.map((m) => (
                <div key={m.label} className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 ${m.on ? "border-emerald-500 bg-emerald-50" : "border-zinc-200"}`}>
                  <m.icon className={`h-4 w-4 ${m.on ? "text-emerald-600" : "text-zinc-500"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11.5px] font-bold text-zinc-900">{m.label}</span>
                  </span>
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${m.on ? "border-emerald-600 bg-emerald-600" : "border-zinc-300"}`}>
                    {m.on && <Check className="h-2.5 w-2.5 text-white" />}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-zinc-200 bg-white px-3 pb-5 pt-2.5">
            <div className="mb-2 flex justify-between text-[11.5px]">
              <span className="text-zinc-500">Total</span>
              <span className="font-black text-zinc-900">{naira(item.price + delivery)}</span>
            </div>
            <div className="rounded-full bg-emerald-600 py-2.5 text-center text-[12px] font-bold text-white">Pay {naira(item.price + delivery)}</div>
            <p className="mt-1.5 text-center text-[9.5px] text-zinc-400">🔒 Secured by Paystack</p>
          </div>
        </div>
      </Phone>
    </div>
  );
}

/* ───────────── Dashboard (browser) ───────────── */
const SALES = [42, 38, 55, 47, 61, 58, 72, 66, 80, 74, 91, 86, 104, 118];
function chartPaths(w: number, h: number) {
  const max = Math.max(...SALES) * 1.1;
  const pts = SALES.map((v, i) => [(i / (SALES.length - 1)) * w, h - (v / max) * h] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return { line, area: `${line} L${w},${h} L0,${h} Z`, last: pts[pts.length - 1] };
}

export function DashboardScreen({ className = "" }: { className?: string }) {
  const W = 520;
  const H = 140;
  const { line, area, last } = chartPaths(W, H);
  const nav = [
    { icon: Home, label: "Home", on: true },
    { icon: ShoppingCart, label: "Orders" },
    { icon: Package, label: "Products" },
    { icon: Users, label: "Customers" },
    { icon: BarChart3, label: "Analytics" },
    { icon: Settings, label: "Settings" },
  ];
  const kpis = [
    { label: "Revenue", value: "₦1.24M", delta: "+18%" },
    { label: "Orders", value: "86", delta: "+12%" },
    { label: "Store visits", value: "3,412", delta: "+24%" },
  ];
  const orders = [
    { id: "DK-4821", who: "Chioma O.", total: 41000, status: "Paid", tone: "bg-emerald-100 text-emerald-700" },
    { id: "DK-4820", who: "Tunde A.", total: 18500, status: "Shipped", tone: "bg-sky-100 text-sky-700" },
    { id: "DK-4819", who: "Amaka E.", total: 63500, status: "Delivered", tone: "bg-zinc-100 text-zinc-600" },
  ];
  return (
    <div className={className} aria-hidden>
      <Browser url="dukanigeria.com/dashboard">
        <div className="flex bg-zinc-50 text-zinc-900">
          <aside className="hidden w-40 shrink-0 border-r border-zinc-200 bg-white p-3 sm:block">
            <span className="mb-4 flex items-center gap-1.5">
              <DukaLogo href={null} size={20} wordmark={false} />
              <span className="text-[13px] font-black tracking-wide">DUKA</span>
            </span>
            {nav.map((n) => (
              <span key={n.label} className={`mb-0.5 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11.5px] font-semibold ${n.on ? "bg-amber-100 text-amber-900" : "text-zinc-500"}`}>
                <n.icon className="h-3.5 w-3.5" /> {n.label}
              </span>
            ))}
          </aside>
          <div className="min-w-0 flex-1 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10.5px] text-zinc-500">Good morning,</p>
                <p className="text-[15px] font-black">Adaeze Kollections</p>
              </div>
              <span className="relative rounded-full bg-white p-1.5 shadow-sm">
                <Bell className="h-3.5 w-3.5 text-zinc-600" />
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-rose-500" />
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {kpis.map((k) => (
                <div key={k.label} className="rounded-xl bg-white p-2.5 shadow-sm">
                  <p className="text-[9.5px] font-semibold text-zinc-500">{k.label}</p>
                  <p className="truncate text-[13px] font-black sm:text-[15px]">{k.value}</p>
                  <p className="text-[9.5px] font-bold text-emerald-600">{k.delta}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 rounded-xl bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-bold">Sales · last 14 days</p>
                <p className="text-[10px] text-zinc-400">₦ thousands</p>
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full sm:h-28" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="dash-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="#f59e0b" stopOpacity="0.35" />
                    <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0.25, 0.5, 0.75].map((g) => (
                  <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="#e4e4e7" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                ))}
                <path d={area} fill="url(#dash-fill)" />
                <path d={line} fill="none" stroke="#f59e0b" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                <circle cx={last[0] - 4} cy={last[1] + 2} r="4" fill="#f59e0b" stroke="#fff" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
            <div className="mt-2 rounded-xl bg-white p-3 shadow-sm">
              <p className="mb-1.5 text-[11px] font-bold">Latest orders</p>
              {orders.map((o) => (
                <div key={o.id} className="flex items-center gap-2 border-t border-zinc-100 py-1.5 text-[10.5px] first:border-0">
                  <span className="w-14 font-mono text-zinc-500">{o.id}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{o.who}</span>
                  <span className="font-bold">{naira(o.total)}</span>
                  <span className={`w-16 rounded-full px-2 py-0.5 text-center text-[9.5px] font-bold ${o.tone}`}>{o.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Browser>
    </div>
  );
}

/* ───────────── Search results (browser) ───────────── */
export function SearchScreen({ className = "" }: { className?: string }) {
  const p = PRODUCTS[0];
  return (
    <div className={className} aria-hidden>
      <Browser url="Search · red top handle bag lagos">
        <div className="bg-white p-4 text-zinc-900">
          <div className="flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-[12px] shadow-sm">
            <Search className="h-3.5 w-3.5 text-zinc-400" /> red top handle bag lagos
          </div>
          <p className="mt-3 text-[11px] font-bold text-zinc-500">Products from stores near you</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[PRODUCTS[0], PRODUCTS[3], PRODUCTS[5]].map((x) => (
              <div key={x.name} className="overflow-hidden rounded-xl border border-zinc-200">
                <div className="relative aspect-square bg-zinc-100">
                  <Image src={x.img} alt="" fill sizes="160px" className="object-cover" />
                </div>
                <div className="p-2">
                  <p className="truncate text-[10.5px] font-semibold">{x.name}</p>
                  <p className="text-[11px] font-black">{naira(x.price)}</p>
                  <p className="truncate text-[9.5px] text-zinc-500">dukanigeria.com</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3 border-t border-zinc-100 pt-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] text-zinc-500">adaeze.dukanigeria.com › products</p>
              <p className="text-[14px] font-semibold leading-snug text-[#1a0dab]">{p.name} · Adaeze Kollections</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[10.5px] text-zinc-600">
                <span className="flex text-amber-500">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} className="h-3 w-3 fill-current" />
                  ))}
                </span>
                4.9 (38) · {naira(p.price)} · <span className="font-semibold text-emerald-700">In stock</span>
              </p>
              <p className="mt-0.5 line-clamp-2 text-[10.5px] text-zinc-600">Structured red leather bag with gold clasp. Delivery across Lagos in 24 hours. Pay by card, transfer or on delivery.</p>
            </div>
            <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
              <Image src={p.img} alt="" fill sizes="64px" className="object-cover" />
            </span>
          </div>
        </div>
      </Browser>
    </div>
  );
}

/* ───────────── Shared link preview + live alerts ───────────── */
export function ShareScreen({ className = "" }: { className?: string }) {
  const p = PRODUCTS[0];
  return (
    <div className={`relative ${className}`} aria-hidden>
      <div className="mx-auto w-full max-w-[300px] rounded-2xl bg-[#efeae2] p-3 shadow-2xl">
        <div className="ml-auto max-w-[92%] overflow-hidden rounded-lg rounded-tr-none bg-[#d9fdd3] p-1 shadow-sm">
          <div className="overflow-hidden rounded-md bg-[#c8ecc0]">
            <div className="relative aspect-[1.91/1] w-full">
              <Image src={p.img} alt="" fill sizes="280px" className="object-cover" />
              <span className="absolute bottom-2 left-2 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white">{naira(p.price)}</span>
            </div>
            <div className="px-2 py-1.5">
              <p className="text-[11.5px] font-bold text-zinc-900">{p.name} · Adaeze Kollections</p>
              <p className="line-clamp-1 text-[10px] text-zinc-600">Structured red leather bag with gold clasp.</p>
              <p className="text-[10px] text-zinc-500">adaeze.dukanigeria.com</p>
            </div>
          </div>
          <p className="px-1.5 pt-1 text-[11.5px] text-sky-700 underline">adaeze.dukanigeria.com/products/red-bag</p>
          <p className="px-1.5 pb-0.5 text-right text-[9px] text-zinc-500">10:02 ✓✓</p>
        </div>
      </div>
      {/* Floating alerts */}
      <div className="absolute -left-2 -top-20 w-56 rounded-2xl border border-white/20 bg-white/90 p-3 text-zinc-900 shadow-xl backdrop-blur sm:-left-6">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> New order
        </p>
        <p className="mt-0.5 text-[13px] font-black">{naira(41000)} · Paid</p>
        <p className="text-[10.5px] text-zinc-500">Chioma O. · from WhatsApp</p>
      </div>
      <div className="absolute -bottom-24 -right-2 w-52 rounded-2xl border border-white/20 bg-zinc-900/90 p-3 text-white shadow-xl backdrop-blur sm:-right-6">
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Payout sent</p>
        <p className="mt-0.5 flex items-center gap-1 text-[13px] font-black">
          {naira(186000)} <ChevronRight className="h-3.5 w-3.5 text-white/50" />
        </p>
        <p className="text-[10.5px] text-white/60">To your bank ••4821</p>
      </div>
    </div>
  );
}
