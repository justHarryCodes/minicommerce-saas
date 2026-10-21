import { notFound } from "next/navigation";
import { getStoreFeatures } from "@/lib/plan";
import { queryOne } from "@/lib/db";
import { getOrSet, cacheKey, TTL } from "@/lib/redis";
import CheckoutClient from "./CheckoutClient";
import { deliverySettingsOf, podSettingsOf } from "@/lib/delivery";
import { parseHours } from "@/lib/hours";
import type { Store } from "@/types";

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

  const paymentMethods: string[] = [];
  if (store.payment_preference === "paystack" || store.payment_preference === "both") {
    paymentMethods.push("paystack");
  }
  if (store.payment_preference === "bank_transfer" || store.payment_preference === "both") {
    paymentMethods.push("transfer");
  }
  const pod = podSettingsOf(store as unknown as Record<string, unknown>);
  if (pod.enabled) paymentMethods.push("pay_on_delivery");

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
