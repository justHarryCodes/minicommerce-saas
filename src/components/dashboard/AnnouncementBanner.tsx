import { activeAnnouncement } from "@/lib/admin/campaigns";
import AnnouncementBannerClient from "./AnnouncementBannerClient";

// A Duka announcement (admin campaign, "Dashboard banner" channel) at the top
// of the vendor dashboard until dismissed (or 30 days pass). It wears the
// campaign's look (emoji badge, colour) and shows its elements.
export default async function AnnouncementBanner({ storeId }: { storeId: string }) {
  const a = await activeAnnouncement(storeId);
  if (!a) return null;
  const fill = (s: string) => s.replace(/\{store\}/gi, a.store_name).replace(/\{name\}/gi, "there");
  return (
    <AnnouncementBannerClient
      campaignId={a.campaign_id}
      headline={fill(a.headline)}
      body={fill(a.body)}
      theme={a.theme}
      cta={a.cta_label && a.cta_url ? { label: a.cta_label, url: a.cta_url } : null}
    />
  );
}
