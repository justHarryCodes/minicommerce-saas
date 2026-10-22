"use client";

// Product page. Behaviour lives in useProductPage; the look comes from the
// theme's product layout (components/storefront/product/layouts).
import { LazyMotion } from "framer-motion";
import { useStore } from "@/lib/store-context";
import { useProductPage, type ProductPageProps } from "@/components/storefront/product/useProductPage";
import { ProductPageView } from "@/components/storefront/product/layouts";

const loadMotion = () => import("@/components/storefront/nav/motion-features").then((m) => m.default);

export default function ProductDetailClient({ bookingsEnabled = true, stockAlertsEnabled = true, ...rest }: ProductPageProps) {
  const p = { ...rest, bookingsEnabled, stockAlertsEnabled };
  const s = useProductPage(p);
  const { theme } = useStore();
  return (
    <LazyMotion features={loadMotion} strict>
      <ProductPageView layout={theme.layout.product ?? "classic"} s={s} p={p} />
    </LazyMotion>
  );
}
