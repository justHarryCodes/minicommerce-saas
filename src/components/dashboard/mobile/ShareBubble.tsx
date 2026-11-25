"use client";

// "Share store" in the stories-style quick actions: same look as the other
// circles, opens the share sheet (WhatsApp, Instagram, TikTok…).
import { Share2 } from "lucide-react";
import ShareButton from "@/components/dashboard/ShareButton";
import { BUBBLE_CLASS, BubbleFace } from "./parts";

export default function ShareBubble({ store }: { store: { name: string; url: string; slug: string } }) {
  return (
    <ShareButton target={{ kind: "store", title: store.name, url: store.url, cardPath: `/api/og/store/${store.slug}` }} className={BUBBLE_CLASS}>
      <BubbleFace label="Share store" icon={Share2} tone="bg-gradient-to-br from-amber-400 to-orange-500 text-black" />
    </ShareButton>
  );
}
