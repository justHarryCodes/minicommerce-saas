import type { Metadata } from "next";
import TrackClient from "./TrackClient";

export const metadata: Metadata = { title: "Track Order" };

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ order?: string; phone?: string }>;
}

export default async function TrackPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { order, phone } = await searchParams;
  return <TrackClient storeSlug={slug} initialOrder={order} initialPhone={phone} />;
}
