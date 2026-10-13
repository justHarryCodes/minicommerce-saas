import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const columns: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/discover", label: "Discover" },
      { href: "/pricing", label: "Pricing" },
      { href: "/resources", label: "Resources" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/affiliate", label: "Affiliates" },
      { href: "/terms", label: "Terms" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/auth/login", label: "Login" },
      { href: "/auth/signup", label: "Sign Up" },
    ],
  },
];

export default function Footer() {
  return (
    <footer
      className="border-t px-4 pt-12 pb-28 lg:pb-10"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="mx-auto max-w-7xl">
        {/* Top: brand + link columns */}
        <div className="grid gap-10 md:grid-cols-[1.4fr_2fr]">
          {/* Brand */}
          <div className="flex flex-col items-start gap-4">
            <Link href="/" className="flex flex-col items-start gap-0.5">
              <Image
                src="/logo.png"
                alt="Duka"
                width={112}
                height={28}
                className="h-7 w-auto object-contain"
              />
              <span
                className="text-xs font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                by Awarizon
              </span>
            </Link>
            <p
              className="max-w-xs text-sm leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              Launch your online store in minutes and start selling to customers
              anywhere.
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
              style={{ background: "var(--accent, #fbbf24)", color: "#000" }}
            >
              Start selling <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Link columns */}
          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-8 sm:grid-cols-3"
          >
            {columns.map((col) => (
              <div key={col.title}>
                <h3
                  className="mb-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  {col.title}
                </h3>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="text-sm transition-opacity hover:underline hover:opacity-80"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 sm:flex-row"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            © {new Date().getFullYear()} Duka by Awarizon. All rights reserved.
          </p>
          <Link
            href="/terms"
            className="text-xs hover:underline"
            style={{ color: "var(--text-muted)" }}
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
