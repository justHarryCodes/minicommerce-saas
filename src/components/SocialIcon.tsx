import Image from "next/image";

// The official social logos (public/social/*.png, made from the full-size
// files in public/). Use these for anything WhatsApp / Instagram / TikTok /
// Facebook / X on the Duka site and the vendor dashboard.

export type SocialName = "whatsapp" | "instagram" | "tiktok" | "facebook" | "x";

export const SOCIAL_LABEL: Record<SocialName, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  x: "X",
};

export default function SocialIcon({ name, size = 20, className = "", label }: { name: SocialName; size?: number; className?: string; /** Text for screen readers; "" when a visible label sits next to it */ label?: string }) {
  return (
    <Image
      src={`/social/${name}.png`}
      alt={label ?? SOCIAL_LABEL[name]}
      width={size}
      height={size}
      // The X logo is black: white on dark backgrounds
      className={`shrink-0 object-contain ${name === "x" ? "dark:invert" : ""} ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
