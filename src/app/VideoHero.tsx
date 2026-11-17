"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Pause, Play } from "lucide-react";

// The landing page's first screen: the Duka story video looping behind
// short, rotating captions and two clear calls to action.
//
// Light on data: the poster shows instantly; the video (1.3 MB on phones,
// 4 MB on desktop) only loads after the page is up, and not at all for
// people with Data Saver or "reduce motion" on. A pause button keeps it
// accessible (moving content must be stoppable).

const CAPTIONS: { lead: string; hi: string }[] = [
  { lead: "Turn what you sell into", hi: "a real online store." },
  { lead: "Snap a photo.", hi: "AI writes the rest." },
  { lead: "Get paid by", hi: "card, transfer & USSD." },
  { lead: "Sell on", hi: "WhatsApp, Instagram & TikTok." },
  { lead: "Orders, stock & delivery,", hi: "all in one place." },
  { lead: "Your brand,", hi: "your own website." },
];
const EVERY_MS = 3400;

export default function VideoHero({ storeCount }: { storeCount: number }) {
  const video = useRef<HTMLVideoElement>(null);
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(true);
  const [calm, setCalm] = useState(false); // prefers-reduced-motion

  // Pick the video for this screen, after the page has loaded
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    setCalm(reduce);
    if (reduce || saveData) {
      setPlaying(false);
      return;
    }
    const pick = () => setSrc(window.innerWidth < 768 ? "/hero-720.mp4" : "/hero-1280.mp4");
    if (document.readyState === "complete") pick();
    else window.addEventListener("load", pick, { once: true });
    return () => window.removeEventListener("load", pick);
  }, []);

  // Rotate captions (paused while the tab is hidden)
  const go = useCallback((next: number) => {
    setI((cur) => {
      setPrev(cur);
      return (next + CAPTIONS.length) % CAPTIONS.length;
    });
  }, []);
  useEffect(() => {
    const t = setInterval(() => {
      if (!document.hidden) go(i + 1);
    }, EVERY_MS);
    return () => clearInterval(t);
  }, [i, go]);

  const toggle = () => {
    const v = video.current;
    if (!v) return setPlaying((p) => !p);
    if (v.paused) {
      v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const c = CAPTIONS[i];
  const p = prev !== null ? CAPTIONS[prev] : null;

  return (
    <section className="relative isolate flex min-h-[600px] items-end overflow-hidden bg-zinc-950 text-white sm:items-center" style={{ height: "100svh", maxHeight: 980 }}>
      {/* Video (decorative) */}
      <video
        ref={video}
        className="absolute inset-0 -z-20 h-full w-full object-cover"
        poster="/hero-poster.jpg"
        src={src ?? undefined}
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {/* Overlay: readable text over any frame */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/45 to-black/25 sm:bg-gradient-to-r sm:from-black/80 sm:via-black/45 sm:to-black/10" aria-hidden />

      <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-24 sm:pb-0 sm:pt-0">
        <div className="max-w-2xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold backdrop-blur-md">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            {storeCount > 0 ? `${storeCount}+ Nigerian stores powered by Duka` : "Nigerian stores powered by Duka"}
          </p>

          <h1 className="font-black tracking-tight">
            <span className="sr-only">Duka: create your online store in Nigeria. </span>
            {/* Rotating caption: the new line rises in, the old one rises out */}
            {/* Room for 3 lines, caption pinned to the bottom: the text and buttons below never jump */}
            <span className="relative flex min-h-[3.2em] flex-col justify-end sm:min-h-[4em] text-[2.35rem] leading-[1.05] sm:text-6xl lg:text-7xl" aria-hidden>
              {p && !calm && (
                <span key={`out-${prev}`} className="hero-cap-out absolute inset-x-0 bottom-0 block">
                  <span className="block">{p.lead}</span>
                  <span className="block text-amber-400">{p.hi}</span>
                </span>
              )}
              <span key={`in-${i}`} className={`${calm ? "" : "hero-cap-in "}block`}>
                <span className="block">{c.lead}</span>
                <span className="block text-amber-400">
                  {c.hi.split(" ").map((w, n) => (
                    // The space sits between the word boxes: inside one it would collapse
                    <span key={n}>
                      {n > 0 && " "}
                      <span className={calm ? "" : "hero-word"} style={{ animationDelay: `${120 + n * 70}ms` }}>{w}</span>
                    </span>
                  ))}
                </span>
              </span>
            </span>
          </h1>
          {/* Screen readers get every message once, not a ticker */}
          <ul className="sr-only">
            {CAPTIONS.map((x) => (
              <li key={x.hi}>{x.lead} {x.hi}</li>
            ))}
          </ul>

          <p className="mt-5 max-w-xl text-base text-white/80 sm:text-lg">
            The online store builder made for Nigeria.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/auth/signup" className="group inline-flex items-center justify-center gap-2 rounded-full bg-amber-400 px-7 py-3.5 text-base font-bold text-black shadow-lg shadow-amber-500/30 transition-transform hover:scale-[1.03] hover:bg-amber-300">
              Start for free <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/discover" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-base font-semibold backdrop-blur-md transition-colors hover:bg-white/20">
              Explore stores
            </Link>
          </div>

          <p className="mt-5 text-[13px] text-white/60">No card needed · Live in minutes · Paystack-secured</p>

          {/* Caption progress: tap to jump */}
          <div className="mt-8 flex gap-1.5" role="tablist" aria-label="Messages">
            {CAPTIONS.map((x, n) => (
              <button
                key={x.hi}
                type="button"
                role="tab"
                aria-selected={n === i}
                aria-label={`${x.lead} ${x.hi}`}
                onClick={() => go(n)}
                className="h-1.5 overflow-hidden rounded-full bg-white/25 transition-all"
                style={{ width: n === i ? 40 : 14 }}
              >
                {n === i && !calm && <span key={`bar-${i}`} className="hero-bar block h-full bg-amber-400" style={{ animationDuration: `${EVERY_MS}ms` }} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      {src && (
        <button type="button" onClick={toggle} aria-label={playing ? "Pause background video" : "Play background video"} className="absolute bottom-5 right-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/40 backdrop-blur-md hover:bg-black/60 sm:right-6">
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
      )}
      <a href="#how-duka-works" className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-[11px] font-semibold text-white/70 hover:text-white sm:flex" aria-label="Scroll to see how Duka works">
        See how it works
        <ChevronDown className="h-4 w-4 animate-bounce" />
      </a>
    </section>
  );
}
