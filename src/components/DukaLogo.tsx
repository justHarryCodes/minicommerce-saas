import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";

// The Duka brand mark: the orange cart "d" logo + the DUKA wordmark, the
// same as the homepage header. Use this for Duka's own branding everywhere
// (never a letter placeholder).

const wordmarkFont = localFont({
  src: "../fonts/sora-latin.woff2",
  weight: "100 800",
  display: "swap",
});

export default function DukaLogo({
  href = "/",
  size = 32,
  wordmark = true,
  className = "",
}: {
  /** Where the logo links; null for no link */
  href?: string | null;
  /** Height of the mark in px (the wordmark scales with it) */
  size?: number;
  wordmark?: boolean;
  className?: string;
}) {
  const content = (
    <>
      {/* logo-mark.png is logo.png cropped to the mark (163x256), so `size` is the mark's real height */}
      <Image src="/logo-mark.png" alt={wordmark ? "" : "Duka"} width={Math.round(size * 0.64)} height={size} style={{ height: size, width: "auto" }} className="object-contain" priority />
      {wordmark && (
        <span className={`${wordmarkFont.className} leading-none tracking-[0.04em] text-zinc-900 dark:text-white`} style={{ fontSize: Math.round(size * 0.78) }}>
          DUKA
        </span>
      )}
    </>
  );
  const cls = `inline-flex shrink-0 items-center gap-1.5 ${className}`;
  return href ? (
    <Link href={href} className={cls} aria-label="Duka home">
      {content}
    </Link>
  ) : (
    <span className={cls}>{content}</span>
  );
}
