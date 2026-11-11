import { notFound } from "next/navigation";
import { getStoreFeatures } from "@/lib/plan";
import { queryOne } from "@/lib/db";
import { getOrSet, cacheKey, TTL } from "@/lib/redis";
import CheckoutClient from "./CheckoutClient";
import { deliverySettingsOf, podSettingsOf } from "@/lib/delivery";
import { parseHours } from "@/lib/hours";
import type { Store } from "@/types";
import { checkoutMethods, dukaPayActive } from "@/lib/duka-pay";
import { getPlatformSettings } from "@/lib/admin-auth";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CheckoutPage({ params }: Props) {
  const { slug } = await params;

  const store = await getOrSet<Store>(
    cacheKey.storeMeta(slug),
    () => queryOne<Store>("SELECT * FROM stores WHERE slug = $1 AND is_active = true", [slug]),
    TTL.STORE_META
  );

  if (!store) notFound();

  // Duka Pay (card / transfer / USSD) comes first, so it's the default
  const dukaPayStore = store as unknown as Parameters<typeof checkoutMethods>[0];
  const online = dukaPayActive(dukaPayStore);
  const podRaw = podSettingsOf(store as unknown as Record<string, unknown>);
  // Deposits are paid online, so they need Duka Pay too
  const pod = online ? podRaw : { ...podRaw, depositPercent: 0 };
  const { allow_manual_transfers } = await getPlatformSettings();
  const paymentMethods: string[] = checkoutMethods(dukaPayStore, pod.enabled, { allowTransfers: allow_manual_transfers });

  const features = await getStoreFeatures(store.id);

  return (
    <CheckoutClient
      storeSlug={slug}
      storeId={store.id}
      paymentMethods={paymentMethods}
      bankName={store.bank_name}
      accountNumber={store.bank_account_number}
      accountName={store.bank_account_name}
      paystackPublicKey={store.paystack_public_key}
      returnPolicy={store.return_policy}
      deliveryTimeFrame={store.delivery_time_frame ?? undefined}
      delivery={deliverySettingsOf(store as unknown as Record<string, unknown>)}
      payOnDelivery={pod}
      hours={parseHours(store.opening_hours)}
      allowPreorders={store.allow_preorders !== false}
      minimumOrder={store.minimum_order != null ? Number(store.minimum_order) : null}
      couponsEnabled={features.has("coupons")}
      giftCardsEnabled={features.has("gift_cards")}
    />
  );
}
