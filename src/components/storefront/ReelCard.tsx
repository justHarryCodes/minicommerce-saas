"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { Eye, Share2, ShoppingBag, Play, Volume2, VolumeX } from "lucide-react";
import { useCart } from "./CartProvider";
import ShareSheet from "./ShareSheet";
import type { Reel, ReelProduct } from "@/types";

interface Props {
  reel: Reel;
  shareBase: string; // e.g. "/store/myshop" or "" on subdomain
  isActive?: boolean; // true when this reel is snapped into view (parent controls)
}

export default function ReelCard({ reel, shareBase, isActive = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [showProducts, setShowProducts] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [viewTracked, setViewTracked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const { addItem } = useCart();

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${shareBase}/reels/${reel.id}`
      : `${shareBase}/reels/${reel.id}`;

  // Track view once per mount when reel becomes active
  const trackView = useCallback(() => {
    if (viewTracked) return;
    setViewTracked(true);
    const sessionId = sessionStorage.getItem("sf_session") ?? undefined;
    fetch(`/api/reels/${reel.id}/view`, {
      method: "POST",
      headers: sessionId ? { "x-session-id": sessionId } : {},
    }).catch(() => {});
  }, [reel.id, viewTracked]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.play().then(() => setPlaying(true)).catch(() => {});
      trackView();
    } else {
      video.pause();
      video.currentTime = 0;
      setPlaying(false);
    }
  }, [isActive, trackView]);

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setPlaying(false);
    }
  }

  function addToCart(product: ReelProduct) {
    addItem({
      product_id: product.product_id,
      name: product.name,
      price: product.price,
      image_url: product.image_url ?? undefined,
      stock_quantity: product.stock_quantity,
    });
  }

  const products = reel.products ?? [];

  return (
    <div className="relative w-full h-full bg-black select-none">
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.video_url}
        poster={reel.thumbnail_url ?? undefined}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        muted={muted}
        playsInline
        preload="metadata"
        onClick={togglePlay}
      />

      {/* Tap-to-play overlay (shown briefly when paused) */}
      {!playing && (
        <button
          className="absolute inset-0 flex items-center justify-center z-10"
          onClick={togglePlay}
          aria-label="Play"
        >
          <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-7 h-7 text-white fill-white ml-1" />
          </div>
        </button>
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

      {/* Store badge (discovery feed) */}
      {reel.store_name && (
        <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
          {reel.store_logo ? (
            <Image
              src={reel.store_logo}
              alt={reel.store_name}
              width={28}
              height={28}
              className="w-7 h-7 rounded-full object-cover border border-white/30"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">
              {reel.store_name[0]}
            </div>
          )}
          <span className="text-white text-xs font-semibold drop-shadow">
            {reel.store_name}
          </span>
        </div>
      )}

      {/* Right-side actions */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-20">
        {/* Mute */}
        <button
          onClick={toggleMute}
          className="flex flex-col items-center gap-1"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            {muted ? (
              <VolumeX className="w-5 h-5 text-white" />
            ) : (
              <Volume2 className="w-5 h-5 text-white" />
            )}
          </div>
        </button>

        {/* View count */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">
            {reel.view_count >= 1000
              ? `${(reel.view_count / 1000).toFixed(1)}k`
              : reel.view_count}
          </span>
        </div>

        {/* Share */}
        <button
          onClick={() => setShowShare(true)}
          className="flex flex-col items-center gap-1"
          aria-label="Share"
        >
          <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">Share</span>
        </button>

        {/* Products toggle */}
        {products.length > 0 && (
          <button
            onClick={() => setShowProducts((v) => !v)}
            className="flex flex-col items-center gap-1"
            aria-label="View products"
          >
            <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-zinc-900" />
            </div>
            <span className="text-white text-xs font-semibold drop-shadow">
              {products.length} item{products.length !== 1 ? "s" : ""}
            </span>
          </button>
        )}
      </div>

      {/* Bottom meta */}
      <div className="absolute bottom-0 left-0 right-14 p-4 z-20">
        {reel.title && (
          <p className="text-white font-semibold text-sm mb-1 line-clamp-2 drop-shadow">
            {reel.title}
          </p>
        )}
        {reel.description && (
          <p className="text-white/80 text-xs line-clamp-2 drop-shadow">
            {reel.description}
          </p>
        )}
      </div>

      {/* Products drawer (slides up from bottom) */}
      {showProducts && products.length > 0 && (
        <>
          <div
            className="absolute inset-0 z-30"
            onClick={() => setShowProducts(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 rounded-t-2xl p-4 pb-8 max-h-[55%] overflow-y-auto">
            <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-4" />
            <p className="font-semibold text-zinc-900 dark:text-white text-sm mb-3">
              Shoppable Products
            </p>
            <div className="flex flex-col gap-3">
              {products.map((p) => (
                <div key={p.product_id} className="flex items-center gap-3">
                  {p.image_url ? (
                    <Image
                      src={p.image_url}
                      alt={p.name}
                      width={52}
                      height={52}
                      className="w-13 h-13 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-13 h-13 rounded-xl bg-zinc-100 dark:bg-zinc-800 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                      {p.name}
                    </p>
                    <p className="text-sm font-bold" style={{ color: "var(--sf-accent)" }}>
                      ₦{p.price.toLocaleString()}
                    </p>
                  </div>
                  {p.stock_quantity > 0 ? (
                    <button
                      onClick={() => addToCart(p)}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                      style={{ backgroundColor: "var(--sf-accent)" }}
                    >
                      Add
                    </button>
                  ) : (
                    <span className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 bg-zinc-100 dark:bg-zinc-800">
                      Sold out
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Share sheet */}
      {showShare && (
        <ShareSheet
          url={shareUrl}
          title={reel.title}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
