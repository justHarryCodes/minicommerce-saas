"use client";

import { useEffect, useState } from "react";
import { X, PlayCircle, BookOpen, ArrowRight } from "lucide-react";

const STORAGE_KEY = "duka_tutorial_banner_dismissed";
const YOUTUBE_URL = "https://youtu.be/qKdhwOZlQjs";

export default function TutorialBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="relative mb-6 rounded-2xl overflow-hidden shadow-sm">
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #92400e 0%, #b45309 40%, #d97706 100%)",
        }}
      />

      {/* Decorative circles */}
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
      <div className="absolute -bottom-10 right-24 w-32 h-32 rounded-full bg-white/5" />
      <div className="absolute top-0 right-1/3 w-20 h-20 rounded-full bg-white/5" />

      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle, white 1px, transparent 0)`,
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative z-10 flex items-center gap-4 p-4 sm:p-5">

        {/* Play icon block */}
        <div className="hidden sm:flex shrink-0 w-14 h-14 rounded-xl bg-white/15 border border-white/20 items-center justify-center">
          <PlayCircle className="w-8 h-8 text-white" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-white text-[10px] font-bold uppercase tracking-widest">
              <BookOpen className="w-3 h-3" />
              Tutorial
            </span>
          </div>
          <p className="text-white font-black text-base sm:text-lg leading-snug">
            Get Started with Duka
          </p>
          <p className="text-amber-100/80 text-xs sm:text-sm mt-0.5 leading-relaxed">
            Watch our step-by-step guide — set up your store, add products, and make your first sale.
          </p>
        </div>

        {/* CTA */}
        <div className="shrink-0 flex items-center gap-2">
          <a
            href={YOUTUBE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-amber-800 font-bold text-sm hover:bg-amber-50 transition-colors shadow-sm whitespace-nowrap"
          >
            Watch now
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
          {/* Mobile: icon-only CTA */}
          <a
            href={YOUTUBE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="sm:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-white/20 border border-white/30 text-white hover:bg-white/30 transition-colors"
            aria-label="Watch tutorial"
          >
            <PlayCircle className="w-5 h-5" />
          </a>
          {/* Close */}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss tutorial banner"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 border border-white/20 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20" />
    </div>
  );
}
