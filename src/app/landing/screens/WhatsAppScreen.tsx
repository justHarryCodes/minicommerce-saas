"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowLeft, BadgeCheck, CheckCheck, Mic, Paperclip, Phone as PhoneIcon, ShoppingCart, Video } from "lucide-react";
import { Phone, StatusBar } from "../Frames";
import { PRODUCTS, naira } from "../media";

// A shopper buying inside WhatsApp from a store powered by Duka: ask,
// see the product card, add to cart, pay, get the confirmation. Plays
// once when it scrolls into view.

const bag = PRODUCTS[0];
const STEPS = 6;

function Bubble({ me, children, time = "10:24" }: { me?: boolean; children: React.ReactNode; time?: string }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className={`relative max-w-[84%] rounded-lg px-2 pb-1 pt-1.5 text-[12px] leading-snug text-zinc-900 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] ${me ? "ml-auto rounded-tr-none bg-[#d9fdd3]" : "rounded-tl-none bg-white"}`}
    >
      {children}
      <span className="float-right ml-2 mt-1 flex items-center gap-0.5 text-[9.5px] text-zinc-500">
        {time}
        {me && <CheckCheck className="h-3 w-3 text-sky-500" />}
      </span>
    </motion.div>
  );
}

function Typing() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex w-fit gap-1 rounded-lg rounded-tl-none bg-white px-3 py-2.5 shadow-sm">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-zinc-400" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }} />
      ))}
    </motion.div>
  );
}

export default function WhatsAppScreen({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) return setStep(STEPS);
    if (step >= STEPS) return;
    const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 300 : 1100);
    return () => clearTimeout(t);
  }, [inView, reduce, step]);

  const typing = step > 0 && step < STEPS && step % 2 === 1;

  return (
    <div ref={ref} className={className} aria-hidden>
      <Phone className="aspect-[9/19] w-full">
        <div className="flex h-full flex-col">
          <div className="bg-white">
            <StatusBar />
            <div className="flex items-center gap-2 border-b border-zinc-200 px-2.5 pb-2 pt-1">
              <ArrowLeft className="h-4 w-4 text-zinc-700" />
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-orange-400 text-[11px] font-black text-white">AK</span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 truncate text-[12.5px] font-bold text-zinc-900">
                  Adaeze Kollections <BadgeCheck className="h-3.5 w-3.5 shrink-0 fill-emerald-500 text-white" />
                </p>
                <p className="text-[10px] text-zinc-500">Business account · online</p>
              </div>
              <Video className="h-4 w-4 text-zinc-700" />
              <PhoneIcon className="ml-2 h-3.5 w-3.5 text-zinc-700" />
            </div>
          </div>

          {/* Chat */}
          <div
            className="flex flex-1 flex-col justify-end gap-1.5 overflow-hidden px-2.5 py-3"
            style={{
              backgroundColor: "#efeae2",
              backgroundImage: "radial-gradient(rgba(0,0,0,0.045) 1px, transparent 1px)",
              backgroundSize: "14px 14px",
            }}
          >
            <p className="mx-auto mb-1 rounded-md bg-white/80 px-2 py-0.5 text-[9.5px] font-semibold text-zinc-500">TODAY</p>
            <Bubble me time="10:21">Hi! Do you still have the red bag? 😍</Bubble>

            {step >= 2 && (
              <Bubble time="10:21">
                <span className="block">Hi Chioma 👋 Yes, just restocked:</span>
                <span className="mt-1.5 block overflow-hidden rounded-md border border-zinc-200">
                  <span className="relative block aspect-[4/3] w-full">
                    <Image src={bag.img} alt="" fill sizes="240px" className="object-cover" />
                  </span>
                  <span className="block px-2 py-1.5">
                    <span className="block text-[12px] font-bold">{bag.name}</span>
                    <span className="block text-[12px] font-black text-emerald-700">
                      {naira(bag.price)} <s className="ml-1 font-medium text-zinc-400">{naira(bag.was!)}</s>
                    </span>
                  </span>
                  <span className="grid grid-cols-2 border-t border-zinc-200 text-center text-[11.5px] font-semibold text-sky-600">
                    <span className="py-1.5">View</span>
                    <span className="border-l border-zinc-200 py-1.5">Add to cart</span>
                  </span>
                </span>
              </Bubble>
            )}

            {step >= 3 && <Bubble me time="10:22">Add to cart 🛒</Bubble>}

            {step >= 4 && (
              <Bubble time="10:22">
                <span className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
                    <ShoppingCart className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block font-bold">Your cart · 1 item</span>
                    <span className="block text-zinc-500">Total {naira(bag.price)}</span>
                  </span>
                </span>
                <span className="mt-1.5 block rounded-md bg-emerald-600 py-1.5 text-center text-[11.5px] font-bold text-white">
                  Checkout securely
                </span>
              </Bubble>
            )}

            {step >= 6 && (
              <Bubble time="10:24">
                <span className="block font-bold text-emerald-700">✅ Payment received</span>
                <span className="block">Order DK-4821 · {naira(bag.price)}</span>
                <span className="block text-zinc-500">Delivery to Lekki tomorrow 🛵</span>
              </Bubble>
            )}

            <AnimatePresence>{typing && <Typing key={`t${step}`} />}</AnimatePresence>
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 bg-[#f0f2f5] px-2.5 pb-4 pt-2">
            <span className="flex flex-1 items-center gap-2 rounded-full bg-white px-3 py-2 text-[11.5px] text-zinc-400">
              Message <Paperclip className="ml-auto h-3.5 w-3.5" />
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Mic className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Phone>
    </div>
  );
}
