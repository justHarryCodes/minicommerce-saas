// Presentation half of the storefront homepage / category page. It takes
// already-fetched data so real stores (src/app/store/[slug]/page.tsx) and
// theme demo stores (src/app/theme-demo) render through exactly the same code.

import Link from "next/link";
import { ChevronRight, Film, MessageCircle, Package } from "lucide-react";
import ProductCard from "@/components/storefront/ProductCard";
import BookmarkSlider from "@/components/storefront/BookmarkSlider";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import {
  AboutSection,
  CategoryStrip,
  CtaBand,
  Hero,
  HighlightsSection,
  ProductRail,
  PromoSection,
  SectionHeader,
  TestimonialsSection,
  gridClass,
  type CategoryTileData,
} from "@/components/storefront/ThemeSections";
import type { ResolvedTheme, SectionId, Testimonial } from "@/lib/themes/types";
import type { Category, Product, Store } from "@/types";

export interface StorefrontHomeProps {
  store: Store;
  theme: ResolvedTheme;
  slug: string;
  storeBase: string;
  category?: string;
  sub?: string;
  topCategories: Category[];
  subcategories: Category[];
  activeCategory?: Category;
  activeSub?: Category;
  /** In-stock products for the current view (all, or the active category) */
  products: Product[];
  featuredProducts: Product[];
  categoryTiles: CategoryTileData[];
  /** Top products per category, for the category rails */
  railRows: Product[];
  testimonials: Testimonial[];
  /** Hide the "saved items" slider (demo stores) */
  hideBookmarks?: boolean;
  /** Demo stores: show WhatsApp buttons (inert) so the design is visible without a real number */
  demoContact?: boolean;
  /** Footer links to the store's published pages and blog */
  footerLinks?: { href: string; label: string }[];
}

export default function StorefrontHome(props: StorefrontHomeProps) {
  const {
    store,
    theme,
    slug,
    storeBase,
    category,
    sub,
    topCategories,
    subcategories,
    activeCategory,
    activeSub,
    products,
    categoryTiles,
    railRows,
    testimonials,
  } = props;

  const homeHref = storeBase || "/";
  const isHome = !category;
  const sections = theme.layout.sections;
  const centeredHeaders = theme.layout.header === "centered";

  // "Shop" CTAs scroll to the full grid; if the theme hides it, fall back to
  // whatever product-ish section is still on the page.
  const shopAllHref = sections.includes("allProducts")
    ? "#shop"
    : sections.includes("categories")
      ? "#collections"
      : "#featured";

  const bannerImages: string[] = store.banner_images ?? [];
  const whatsappHref = store.whatsapp
    ? `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}`
    : props.demoContact
      ? "#"
      : null;

  // No hand-picked featured products yet? Show the newest few instead so the
  // section a theme leads with is never just missing.
  const featuredProducts = props.featuredProducts.length > 0 ? props.featuredProducts : products.slice(0, 8);
  const featuredSubtitle = props.featuredProducts.length > 0 ? "Picked by the store" : undefined;

  const visibleTiles = categoryTiles.filter((c) => c.product_count > 0);
  const countById = new Map(categoryTiles.map((c) => [c.id, c.product_count]));

  const railByCategory = new Map<string, Product[]>();
  for (const p of railRows) {
    const key = p.category_id as string;
    const list = railByCategory.get(key) ?? [];
    list.push(p);
    railByCategory.set(key, list);
  }
  // A row of one or two products looks unfinished — only give a category its
  // own rail once it can fill one.
  const railCategories = topCategories.filter((c) => (railByCategory.get(c.id)?.length ?? 0) >= 4).slice(0, 5);

  const newArrivals =
    products.length >= 6
      ? [...products]
          .sort((a, b) => +new Date(b.created_at as unknown as string) - +new Date(a.created_at as unknown as string))
          .slice(0, 10)
      : [];

  // Imagery for promo / about blocks: a second banner if there is one,
  // otherwise a product photo, so the section still looks intentional.
  const productImage = (i: number) => {
    const p = products[i];
    return p ? (p.images?.[0] ?? p.image_url ?? null) : null;
  };
  const promoImage = bannerImages[1] ?? bannerImages[0] ?? productImage(2);
  const aboutImage = bannerImages[2] ?? bannerImages[1] ?? null;

  const perks = [
    { href: `${storeBase}/track`, icon: Package, title: "Track order", text: "See where your order is" },
    { href: `${storeBase}/reels`, icon: Film, title: "Reels", text: "Shop from short videos" },
    ...(whatsappHref ? [{ href: whatsappHref, icon: MessageCircle, title: "WhatsApp", text: "Ask the store anything" }] : []),
  ];

  const sectionContent: Record<SectionId, React.ReactNode> = {
    hero: <Hero store={store} theme={theme} bannerImages={bannerImages} whatsappHref={whatsappHref} ctaHref={shopAllHref} />,

    highlights: <HighlightsSection theme={theme} />,

    categories: visibleTiles.length > 0 && (
      <section id="collections" className="sf-reveal scroll-mt-36 lg:px-6">
        <div className="px-4 lg:px-0">
          <SectionHeader title={theme.copy.categoriesTitle} centered={centeredHeaders} />
        </div>
        <CategoryStrip tiles={visibleTiles} homeHref={homeHref} theme={theme} shopAllHref={shopAllHref} />
      </section>
    ),

    perks: (
      <section className="px-4 lg:px-6">
        <div className={`grid gap-2 sm:gap-3 ${perks.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {perks.map(({ href, icon: Icon, title, text }) => (
            <Link
              key={title}
              href={href}
              {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="flex flex-col items-center gap-2 rounded-[var(--sf-radius)] border border-surface-100 px-3 py-4 text-center transition-colors hover:bg-surface-50 dark:border-surface-800 dark:hover:bg-surface-800 sm:flex-row sm:gap-3.5 sm:px-5 sm:text-left"
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
                style={{ backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)" }}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-surface-900 dark:text-white">{title}</span>
                <span className="hidden text-xs text-surface-500 dark:text-surface-400 sm:block">{text}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    ),

    featured: featuredProducts.length > 0 && (
      <section id="featured" className="sf-reveal scroll-mt-36 px-4 lg:px-6">
        <SectionHeader title={theme.copy.featuredTitle} subtitle={featuredSubtitle} href={shopAllHref} linkLabel="View all" centered={centeredHeaders} />
        <ProductRail products={featuredProducts} slug={slug} theme={theme} />
      </section>
    ),

    promo: <PromoSection theme={theme} image={promoImage} href={shopAllHref} />,

    newArrivals: newArrivals.length > 0 && (
      <section className="sf-reveal px-4 lg:px-6">
        <SectionHeader title={theme.copy.newArrivalsTitle} subtitle="The latest additions" href={shopAllHref} linkLabel="Browse all" centered={centeredHeaders} />
        <ProductRail products={newArrivals} slug={slug} theme={theme} />
      </section>
    ),

    categoryRails: railCategories.length > 0 && (
      <div className="space-y-12 px-4 lg:space-y-16 lg:px-6">
        {railCategories.map((cat, i) => (
          <section
            key={cat.id}
            className={`sf-reveal ${
              i % 2 === 0
                ? "-mx-4 bg-surface-50 px-4 py-8 dark:bg-surface-800/40 lg:mx-0 lg:rounded-[calc(var(--sf-radius)*1.5)] lg:px-8"
                : ""
            }`}
          >
            <SectionHeader
              title={cat.name}
              href={`${homeHref}?category=${cat.slug}`}
              linkLabel={`See all ${countById.get(cat.id) ?? ""}`.trim()}
            />
            <ProductRail products={railByCategory.get(cat.id) ?? []} slug={slug} theme={theme} />
          </section>
        ))}
      </div>
    ),

    // Rendered below with the shared product grid so the category view and
    // the home "all products" block stay one implementation.
    allProducts: null,

    testimonials: <TestimonialsSection theme={theme} reviews={testimonials} centered={centeredHeaders} />,

    about: <AboutSection store={store} whatsappHref={whatsappHref} image={aboutImage} />,

    ctaBand: <CtaBand theme={theme} whatsappHref={whatsappHref} fallbackHref={shopAllHref} />,
  };

  const allProductsIndex = sections.indexOf("allProducts");
  const sectionsBeforeGrid = allProductsIndex === -1 ? sections : sections.slice(0, allProductsIndex);
  const sectionsAfterGrid = allProductsIndex === -1 ? [] : sections.slice(allProductsIndex + 1);
  const showGrid = !isHome || allProductsIndex !== -1;

  const renderSections = (ids: SectionId[]) =>
    ids.map((id, i) =>
      sectionContent[id] ? (
        // A full-bleed hero sits flush under the header; everything else gets
        // the theme's section rhythm.
        <div key={id} className={id === "hero" && i === 0 ? "" : "sf-section"}>
          {sectionContent[id]}
        </div>
      ) : null,
    );

  const fullBleedHero = isHome && sections[0] === "hero" && theme.layout.hero === "fullbleed";

  return (
    <>
      {fullBleedHero && renderSections(["hero"])}
      <div className="mx-auto max-w-7xl">
        {/* ═══════════════ HOME ═══════════════ */}
        {isHome && renderSections(fullBleedHero ? sectionsBeforeGrid.slice(1) : sectionsBeforeGrid)}

        {/* ═══════════════ CATEGORY VIEW ═══════════════ */}
        {!isHome && (
          <div className="px-4 pt-8 lg:px-6 lg:pt-10">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-surface-500 dark:text-surface-400">
              <Link href={homeHref} className="hover:text-surface-900 dark:hover:text-white">
                Home
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              {activeSub ? (
                <>
                  <Link href={`${homeHref}?category=${category}`} className="hover:text-surface-900 dark:hover:text-white">
                    {activeCategory?.name}
                  </Link>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="font-semibold text-surface-900 dark:text-white">{activeSub.name}</span>
                </>
              ) : (
                <span className="font-semibold text-surface-900 dark:text-white">{activeCategory?.name ?? "Category"}</span>
              )}
            </nav>

            <div className="mt-4 flex items-end justify-between gap-4">
              <h1 className="text-3xl text-surface-900 dark:text-white sm:text-5xl">{activeSub?.name ?? activeCategory?.name ?? "Products"}</h1>
              <span className="shrink-0 text-sm text-surface-500 dark:text-surface-400">
                {products.length} item{products.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Other categories */}
            <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:px-0">
              <Link
                href={homeHref}
                className="sf-btn shrink-0 whitespace-nowrap bg-surface-100 px-4 py-2 text-sm !font-semibold text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
              >
                All
              </Link>
              {topCategories.map((cat) => {
                const active = category === cat.slug;
                return (
                  <Link
                    key={cat.id}
                    href={`${homeHref}?category=${cat.slug}`}
                    className={`sf-btn shrink-0 whitespace-nowrap px-4 py-2 text-sm !font-semibold ${
                      active
                        ? "text-[color:var(--sf-on-accent)]"
                        : "bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
                    }`}
                    style={active ? { backgroundColor: "var(--sf-accent)" } : {}}
                  >
                    {cat.name}
                  </Link>
                );
              })}
            </div>

            {/* Subcategories */}
            {subcategories.length > 0 && (
              <div className="-mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:px-0">
                <Link
                  href={`${homeHref}?category=${category}`}
                  className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    !sub
                      ? "bg-surface-900 text-white dark:bg-surface-100 dark:text-black"
                      : "bg-surface-100 text-surface-500 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700"
                  }`}
                >
                  All {activeCategory?.name}
                </Link>
                {subcategories.map((s) => (
                  <Link
                    key={s.id}
                    href={`${homeHref}?category=${category}&sub=${s.slug}`}
                    className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      sub === s.slug
                        ? "bg-surface-900 text-white dark:bg-surface-100 dark:text-black"
                        : "bg-surface-100 text-surface-500 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700"
                    }`}
                  >
                    {s.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ PRODUCT GRID (both views) ═══════════════ */}
        {showGrid && (
          <section id="shop" className={`scroll-mt-36 px-4 lg:px-6 ${isHome ? "sf-section" : "pt-6"}`}>
            {isHome && products.length > 0 && (
              <SectionHeader
                title={theme.copy.allProductsTitle}
                subtitle={`${products.length} item${products.length !== 1 ? "s" : ""}`}
                centered={centeredHeaders}
              />
            )}

            {products.length === 0 ? (
              <div className="py-24 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-100 text-3xl dark:bg-surface-800">🛍️</div>
                <p className="mb-1 font-bold text-surface-900 dark:text-white">{category ? "Nothing here yet" : "No products yet"}</p>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  {category ? "This category has no products in stock. Try another one." : "This store hasn't added products yet. Check back soon."}
                </p>
                {category && (
                  <Link
                    href={homeHref}
                    className="mt-5 inline-block rounded-full bg-surface-900 px-5 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-black"
                  >
                    Browse all products
                  </Link>
                )}
              </div>
            ) : (
              <div className={gridClass(theme.layout)}>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} storeSlug={slug} />
                ))}
              </div>
            )}
          </section>
        )}

        {isHome && renderSections(sectionsAfterGrid)}

        {!props.hideBookmarks && (
          <div className="px-4 pt-12 lg:px-6">
            <BookmarkSlider storeSlug={slug} />
          </div>
        )}
      </div>

      <StorefrontFooter store={store} theme={theme} storeBase={storeBase} categories={topCategories} pageLinks={props.footerLinks} />
    </>
  );
}
