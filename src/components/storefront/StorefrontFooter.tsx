import Link from "next/link";
import { ArrowUpRight, MessageCircle, Phone } from "lucide-react";
import type { ResolvedTheme } from "@/lib/themes/types";
import type { Category, Store } from "@/types";

interface Props {
  store: Store;
  theme: ResolvedTheme;
  storeBase: string;
  categories: Category[];
}

const year = () => new Date().getFullYear();

function PoweredBy() {
  return (
    <>
      Powered by{" "}
      <a href="https://dukanigeria.com" className="font-semibold hover:underline">
        Duka
      </a>
    </>
  );
}

export default function StorefrontFooter({ store, theme, storeBase, categories }: Props) {
  const homeHref = storeBase || "/";
  const whatsappHref = store.whatsapp ? `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}` : null;
  const shopLinks = [
    { href: homeHref, label: theme.copy.allProductsTitle },
    ...categories.slice(0, 5).map((c) => ({ href: `${homeHref}?category=${c.slug}`, label: c.name })),
  ];
  const helpLinks = [
    { href: `${storeBase}/track`, label: "Track your order" },
    { href: `${storeBase}/reels`, label: "Reels" },
  ];

  if (theme.layout.footer === "minimal") {
    return (
      <footer className="mt-[var(--sf-gap)] border-t border-surface-200/70 dark:border-surface-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-surface-500 dark:text-surface-400 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <p className="sf-display text-base text-surface-900 dark:text-white">{store.name}</p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {[...shopLinks.slice(0, 3), ...helpLinks].map((l) => (
              <Link key={l.href + l.label} href={l.href} className="hover:text-surface-900 dark:hover:text-white">
                {l.label}
              </Link>
            ))}
            {whatsappHref && (
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="hover:text-surface-900 dark:hover:text-white">
                WhatsApp
              </a>
            )}
          </nav>
          <p className="text-xs">
            © {year()} · <PoweredBy />
          </p>
        </div>
      </footer>
    );
  }

  if (theme.layout.footer === "bold") {
    return (
      <footer className="mt-[var(--sf-gap)] bg-zinc-950 text-white">
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-16 lg:px-6 lg:pt-20">
          <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr_1fr]">
            <div>
              <p className="sf-display text-4xl sm:text-6xl">{store.name}</p>
              {store.description && <p className="mt-4 line-clamp-3 max-w-md text-sm text-white/60">{store.description}</p>}
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sf-btn mt-7 px-6 py-3 text-sm"
                  style={{ backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)" }}
                >
                  <MessageCircle className="h-4 w-4" /> Chat with us
                </a>
              )}
            </div>
            <FooterColumn title="Shop" links={shopLinks} dark />
            <FooterColumn
              title="Help"
              links={helpLinks}
              dark
              extra={
                store.phone && (
                  <a href={`tel:${store.phone}`} className="flex items-center gap-2 text-white/60 hover:text-white">
                    <Phone className="h-4 w-4" /> {store.phone}
                  </a>
                )
              }
            />
          </div>
          <div className="mt-16 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:justify-between">
            <span>© {year()} {store.name}. All rights reserved.</span>
            <span>
              <PoweredBy />
            </span>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="mt-[var(--sf-gap)] border-t border-surface-100 bg-surface-50 dark:border-surface-800 dark:bg-surface-900/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-6">
        <div>
          <p className="sf-display text-xl text-surface-900 dark:text-white">{store.name}</p>
          {store.description && <p className="mt-2 line-clamp-3 max-w-sm text-sm text-surface-500 dark:text-surface-400">{store.description}</p>}
        </div>
        <FooterColumn title="Shop" links={shopLinks} />
        <FooterColumn
          title="Help"
          links={helpLinks}
          extra={
            <>
              {whatsappHref && (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-surface-900 dark:hover:text-white">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              )}
              {store.phone && (
                <a href={`tel:${store.phone}`} className="flex items-center gap-2 hover:text-surface-900 dark:hover:text-white">
                  <Phone className="h-4 w-4" /> {store.phone}
                </a>
              )}
            </>
          }
        />
      </div>
      <div className="border-t border-surface-100 px-4 py-5 text-center text-xs text-surface-400 dark:border-surface-800 lg:px-6">
        © {year()} {store.name} · <PoweredBy />
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
  extra,
  dark,
}: {
  title: string;
  links: { href: string; label: string }[];
  extra?: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div>
      <p className={`mb-4 text-xs font-bold uppercase tracking-[0.14em] ${dark ? "text-white/40" : "text-surface-900 dark:text-white"}`}>{title}</p>
      <ul className={`space-y-2.5 text-sm ${dark ? "text-white/70" : "text-surface-500 dark:text-surface-400"}`}>
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className={`group inline-flex items-center gap-1 ${dark ? "hover:text-white" : "hover:text-surface-900 dark:hover:text-white"}`}>
              {l.label}
              {dark && <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />}
            </Link>
          </li>
        ))}
        {extra && <li className="space-y-2.5">{extra}</li>}
      </ul>
    </div>
  );
}
