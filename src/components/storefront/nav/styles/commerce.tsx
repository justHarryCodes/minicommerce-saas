"use client";

// Marketplace, Two-tier and Chips bars — built for big catalogues and
// quick browsing (markets, supermarkets, gadgets, food menus).
import Link from "next/link";
import { LayoutGrid, MessageCircle, Package, Phone, Truck } from "lucide-react";
import { Bar, CartButton, CategoryChips, CategoryLinks, Logo, MenuButton, SavedButton, SearchBar, SearchIcon, toneStyle, useNav } from "../core";
import { MobileRow } from "./basic";

/** 3 · Marketplace — big search bar, labelled actions, department row. */
export function MarketplaceNav() {
  const { opts, openMenu } = useNav();
  return (
    <Bar style={toneStyle(opts.tone)}>
      <div className="lg:hidden">
        <MobileRow search={false} />
        {opts.search !== "hidden" && (
          <div className="px-3 pb-2">
            <SearchBar className="w-full !rounded-xl" />
          </div>
        )}
        <CategoryChips className="px-3 pb-3" />
      </div>
      <div className="mx-auto hidden h-20 max-w-7xl items-center gap-8 px-6 lg:flex">
        <Logo />
        {opts.search !== "hidden" && <SearchBar className="h-12 flex-1 !rounded-xl" placeholder="What are you looking for today?" />}
        <div className="flex items-center gap-1">
          <SavedButton withLabel />
          <CartButton withLabel />
        </div>
      </div>
      <div className="hidden border-y border-[color:var(--nav-line)] lg:block">
        <div className="mx-auto flex h-12 max-w-7xl items-center gap-2 px-6">
          <button
            onClick={openMenu}
            className="mr-1 flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-bold"
            // On a brand-coloured bar the button flips so it still stands out
            style={opts.tone === "accent" ? { background: "var(--sf-on-accent)", color: "var(--sf-accent)" } : { background: "var(--sf-accent)", color: "var(--sf-on-accent)" }}
          >
            <LayoutGrid className="h-4 w-4" /> All departments
          </button>
          <CategoryLinks max={8} className="min-w-0 flex-1" />
        </div>
      </div>
    </Bar>
  );
}

/** 9 · Two-tier — utility row (contact, delivery, tracking) above the main bar. */
export function TwoTierNav() {
  const { opts, store, whatsappHref, storeBase } = useNav();
  const delivery = (store as { delivery_time_frame?: string | null }).delivery_time_frame;
  return (
    <Bar>
      <div className="hidden text-xs lg:block" style={{ ...toneStyle(opts.tone === "page" ? "dark" : opts.tone), background: "var(--nav-bg)", color: "var(--nav-fg)" }}>
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-6 opacity-85">
          <span className="flex items-center gap-2">
            <Truck className="h-3.5 w-3.5" /> {delivery ? `Delivery: ${delivery}` : "Fast, tracked delivery nationwide"}
          </span>
          <div className="flex items-center gap-5">
            <Link href={`${storeBase}/track`} className="flex items-center gap-1.5 hover:opacity-100">
              <Package className="h-3.5 w-3.5" /> Track order
            </Link>
            {whatsappHref && (
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            )}
            {store.phone && (
              <a href={`tel:${store.phone}`} className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> {store.phone}
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="border-b border-[color:var(--nav-line)]" style={{ ...toneStyle("page"), background: "var(--nav-bg)" }}>
        <MobileRow search={false} />
        {opts.search !== "hidden" && (
          <div className="px-3 pb-3 lg:hidden">
            <SearchBar className="w-full" />
          </div>
        )}
        <div className="mx-auto hidden h-[76px] max-w-7xl items-center gap-6 px-6 lg:flex">
          <Logo />
          <CategoryLinks max={5} className="shrink-0" />
          {opts.search !== "hidden" && <SearchBar className="ml-auto w-80" />}
          <div className="flex items-center gap-0.5">
            <SavedButton />
            <CartButton />
          </div>
        </div>
      </div>
    </Bar>
  );
}

/** 10 · Chips — logo row plus a sticky, swipeable chip rail with photos. */
export function ChipsNav() {
  const { opts } = useNav();
  return (
    <Bar className="border-b border-[color:var(--nav-line)]" style={toneStyle(opts.tone)}>
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-3 lg:h-16 lg:px-6">
        <div className="lg:hidden">
          <MenuButton />
        </div>
        <Logo size={opts.logoSize === "lg" ? "md" : opts.logoSize} />
        {opts.search === "bar" && <SearchBar className="ml-6 hidden flex-1 lg:flex" />}
        <div className="ml-auto flex items-center">
          {opts.search !== "hidden" && (
            <span className={opts.search === "bar" ? "lg:hidden" : ""}>
              <SearchIcon />
            </span>
          )}
          <SavedButton />
          <CartButton />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-3 pb-3 lg:px-6">
        <CategoryChips withImages />
      </div>
    </Bar>
  );
}
