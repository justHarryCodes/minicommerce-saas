import { cn } from "@/lib/utils";

// The Duka vendor app on Google Play: run the store from a phone.
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.awarizon.dukavendors";

/** The four-colour Play triangle. */
export function PlayLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden>
      <path fill="#4285F4" d="M60 28c-8 6-12 16-12 28v400c0 12 4 22 12 28l222-228z" />
      <path fill="#34A853" d="M60 28c9-7 23-8 37 0l262 150-77 78z" />
      <path fill="#EA4335" d="M60 484c9 7 23 8 37 0l262-150-77-78z" />
      <path fill="#FBBC04" d="M359 178l67 38c32 18 32 62 0 80l-67 38-77-78z" />
    </svg>
  );
}

/** "Get it on Google Play" badge: black, as Google's own badge. */
export default function GooglePlayBadge({
  className,
  size = "md",
  label = "GET IT ON",
}: {
  className?: string;
  size?: "sm" | "md";
  label?: string;
}) {
  const sm = size === "sm";
  return (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Get the Duka app on Google Play"
      data-play-promo
      className={cn(
        "inline-flex shrink-0 items-center rounded-xl border border-zinc-600 bg-black text-white shadow-sm transition-transform hover:scale-[1.03] active:scale-[0.98]",
        sm ? "h-10 gap-2 px-3" : "h-14 gap-3 px-4",
        className
      )}
    >
      <PlayLogo className={sm ? "h-5 w-5" : "h-7 w-7"} />
      <span className="flex flex-col items-start leading-none">
        <span className={cn("font-semibold tracking-wide text-white/80", sm ? "text-[9px]" : "text-[10px]")}>{label}</span>
        <span className={cn("font-semibold tracking-tight", sm ? "mt-0.5 text-[15px]" : "mt-1 text-xl")}>Google Play</span>
      </span>
    </a>
  );
}
