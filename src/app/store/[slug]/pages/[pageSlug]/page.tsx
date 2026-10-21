import { notFound } from "next/navigation";
import type { Metadata } from "next";
import RichText from "@/components/storefront/RichText";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import { loadStoreChrome } from "@/lib/storefront-page";
import { publishedPage } from "@/lib/store-pages";
import { plainText } from "@/lib/rich-text";

interface Props {
  params: Promise<{ slug: string; pageSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, pageSlug } = await params;
  const ctx = await loadStoreChrome(slug);
  if (!ctx) return {};
  const page = await publishedPage(ctx.store.id, "page", pageSlug);
  if (!page) return {};
  const description = plainText(page.body);
  return { title: page.title, description, openGraph: { title: page.title, description } };
}

export default async function StorePageView({ params }: Props) {
  const { slug, pageSlug } = await params;
  const ctx = await loadStoreChrome(slug);
  if (!ctx) notFound();
  const page = await publishedPage(ctx.store.id, "page", pageSlug);
  if (!page) notFound();

  return (
    <>
      <article className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
        <h1 className="sf-display mb-8 text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">{page.title}</h1>
        <RichText source={page.body} />
      </article>
      <StorefrontFooter store={ctx.store} theme={ctx.theme} storeBase={ctx.storeBase} categories={ctx.topCategories} pageLinks={ctx.footerLinks} />
    </>
  );
}
