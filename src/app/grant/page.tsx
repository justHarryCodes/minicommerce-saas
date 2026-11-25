import type { Metadata } from "next";
import GrantView from "@/components/grant/GrantView";
import { currentRound } from "@/lib/grants";

export const dynamic = "force-dynamic";

const TITLE = "Duka Vendor Grant & Support Fund";
const DESCRIPTION = "Business grants, mentorship, marketing, branding and logistics support for ambitious merchants on Duka. One business receives support every month.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/grant" },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", url: "/grant" },
};

export default async function GrantPage() {
  const round = await currentRound().catch(() => null);
  return <GrantView round={round} />;
}
