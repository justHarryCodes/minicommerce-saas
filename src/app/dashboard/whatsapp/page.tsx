import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCheck, MessageCircle, ShoppingBag, Sparkles, Zap } from "lucide-react";
import { verifySession, getUserStore } from "@/lib/auth";
import { whatsappAddonActive } from "@/lib/meta/addon";
import WhatsAppChannel from "@/components/dashboard/WhatsAppChannel";

export const dynamic = "force-dynamic";
export const metadata = { title: "WhatsApp shop" };

// Add-on #1: the store's shop inside WhatsApp. Its own page (first in the
// sidebar) so vendors find it without digging through Sales channels.

const STEPS = [
  { icon: MessageCircle, title: "Connect your number", text: "Log in with Facebook and pick your WhatsApp Business number. About 2 minutes." },
  { icon: ShoppingBag, title: "Your products appear in WhatsApp", text: "Duka puts your whole catalog in WhatsApp's shop, with photos, prices and stock, and keeps it in sync." },
  { icon: Zap, title: "Customers shop in the chat", text: "They browse, add to cart and pay securely. Orders land in Duka and updates go back to the chat." },
];

function ChatPreview({ store }: { store: string }) {
  const bubble = "max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-snug shadow-sm";
  return (
    <div className="w-full max-w-[300px] overflow-hidden rounded-[22px] border-4 border-zinc-900 bg-[#efeae2] shadow-xl dark:border-zinc-700" aria-hidden>
      <div className="flex items-center gap-2 bg-[#075e54] px-3 py-2.5 text-white">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-black">{store.charAt(0).toUpperCase()}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{store}</span>
        <ShoppingBag className="h-4 w-4" />
      </div>
      <div className="space-y-2 p-3">
        <div className={`${bubble} ml-auto bg-[#d9fdd3] text-zinc-900`}>
          Hi 👋 <span className="ml-1 inline-flex items-center text-[10px] text-sky-600"><CheckCheck className="h-3 w-3" /></span>
        </div>
        <div className={`${bubble} bg-white text-zinc-900`}>
          Welcome to <strong>{store}</strong>! 🛍️ Browse, add to cart and check out right here.
          <div className="mt-2 rounded-lg border border-zinc-200 py-1.5 text-center text-[12px] font-semibold text-[#008069]">☰ Menu</div>
        </div>
        <div className={`${bubble} bg-white p-0 text-zinc-900`}>
          <div className="h-20 rounded-t-xl bg-gradient-to-br from-amber-200 to-rose-200" />
          <div className="px-3 py-2">
            <strong>Ankara Gown</strong>
            <div className="text-[12px]">₦20,000 <span className="text-zinc-400 line-through">₦25,000</span></div>
          </div>
          <div className="border-t border-zinc-100 py-1.5 text-center text-[12px] font-semibold text-[#008069]">🛒 Add to cart</div>
        </div>
        <div className={`${bubble} ml-auto bg-[#d9fdd3] text-zinc-900`}>Checkout ✅</div>
      </div>
    </div>
  );
}

export default async function WhatsAppPage() {
  const user = await verifySession();
  if (!user) redirect("/auth/login");
  const store = await getUserStore(user.firebaseUid);
  if (!store) redirect("/dashboard/orders");
  const included = await whatsappAddonActive(store.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pt-4 lg:pt-0">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#075e54] via-[#128c7e] to-[#25D366] text-white">
        <div className="grid items-center gap-6 p-6 sm:p-8 md:grid-cols-[1fr_auto]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wide">
              <Sparkles className="h-3.5 w-3.5" /> New add-on
            </span>
            <h1 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">Your shop, inside WhatsApp</h1>
            <p className="mt-2 max-w-xl text-sm text-white/85 sm:text-base">
              Customers message your number and shop without leaving the chat: your catalog, cart, checkout and order updates, all on WhatsApp. Works with your Duka products automatically.
            </p>
            {!included && (
              <Link href="/dashboard/billing" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#075e54]">
                See how to switch it on
              </Link>
            )}
          </div>
          <div className="hidden justify-center md:flex">
            <ChatPreview store={store.name} />
          </div>
        </div>
      </section>

      {/* Connect / status: right under the hero, nothing to scroll for */}
      <WhatsAppChannel />

      {/* How it works */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-surface-500">How it works</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-surface-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128c7e]">
                  <s.icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-surface-400">Step {i + 1}</span>
              </div>
              <p className="mt-3 font-semibold text-surface-900 dark:text-white">{s.title}</p>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-center md:hidden">
        <ChatPreview store={store.name} />
      </div>

      <p className="pb-6 text-center text-xs text-surface-400">
        Questions? See <Link href="/dashboard/channels" className="underline">Sales channels</Link> for Google, Facebook and Instagram, or email support@dukanigeria.com.
      </p>
    </div>
  );
}
