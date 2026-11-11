"use client";

// Classic and Boutique bars.
import {
  Bar,
  CartButton,
  CategoryLinks,
  CategoryRail,
  Logo,
  MenuButton,
  SavedButton,
  SearchBar,
  SearchIcon,
  toneStyle,
  useNav,
} from "../core";

/** Shared phone row: menu · centred logo · search · cart, then a swipeable
 *  category rail (unless the bar draws its own). */
export function MobileRow({
  bag = false,
  search = true,
  cats = true,
}: {
  bag?: boolean;
  search?: boolean;
  cats?: boolean;
}) {
  return (
    <>
      <div className="relative flex h-14 items-center justify-between px-2 lg:hidden">
        <MenuButton />
        <div className="absolute left-1/2 -translate-x-1/2">
          <Logo size="sm" />
        </div>
        <div className="flex items-center">
          {search && <SearchIcon />}
          <CartButton bag={bag} />
        </div>
      </div>
      {cats && <CategoryRail className="lg:hidden" />}
    </>
  );
}

/** 1 · Classic — logo, categories, search, saved, cart. */
export function ClassicNav() {
  const { opts } = useNav();
  return (
    <Bar
      className="border-b border-[color:var(--nav-line)]"
      style={toneStyle(opts.tone)}
    >
      <MobileRow search={opts.search !== "bar"} cats={false} />
      {opts.search === "bar" && (
        <div className="px-4 pb-3 lg:hidden">
          <SearchBar className="w-full" />
        </div>
      )}
      <CategoryRail className="lg:hidden" />
      <div className="mx-auto hidden h-[72px] max-w-7xl items-center gap-6 px-6 lg:flex">
        <Logo />
        <CategoryLinks className="min-w-0 flex-1" />
        {opts.search === "bar" && <SearchBar className="w-72" />}
        <div className="flex items-center gap-0.5">
          {opts.search === "icon" && <SearchIcon />}
          <SavedButton />
          <CartButton />
        </div>
      </div>
    </Bar>
  );
}

/** 2 · Boutique — centred logo, links split either side, letter-spaced. */
export function BoutiqueNav() {
  const { opts, categories } = useNav();
  const half = Math.ceil(Math.min(categories.length, 6) / 2);
  return (
    <Bar
      className="border-b border-[color:var(--nav-line)]"
      style={toneStyle(opts.tone)}
    >
      <MobileRow bag />
      <div className="mx-auto hidden h-24 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-8 lg:grid">
        <div className="flex items-center gap-1">
          <MenuButton />
          <CategoryLinks
            max={half}
            linkClass="!text-[11px] uppercase tracking-[0.22em]"
          />
        </div>
        <Logo className="justify-self-center" />
        <div className="flex items-center justify-end gap-0.5">
          <div className="mr-2">
            {/* the second half of the categories, mirrored on the right */}
            <SplitLinks start={half} end={half * 2} />
          </div>
          <SearchIcon />
          <SavedButton />
          <CartButton bag />
        </div>
      </div>
    </Bar>
  );
}

function SplitLinks({ start, end }: { start: number; end: number }) {
  const { categories, homeHref, opts, activeCategory } = useNav();
  if (!opts.categories) return null;
  return (
    <ul className="flex items-center">
      {categories.slice(start, end).map((c) => (
        <li key={c.id}>
          <a
            href={`${homeHref}?category=${c.slug}`}
            className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] opacity-80 hover:opacity-100 ${activeCategory === c.slug ? "!opacity-100 underline underline-offset-8" : ""}`}
          >
            {c.name}
          </a>
        </li>
      ))}
    </ul>
  );
}
