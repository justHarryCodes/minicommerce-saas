import { notFound } from "next/navigation";
import { queryOne } from "@/lib/db";
import { getOrSet, cacheKey, TTL } from "@/lib/redis";
import CheckoutClient from "./CheckoutClient";
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
    />
  );
}
