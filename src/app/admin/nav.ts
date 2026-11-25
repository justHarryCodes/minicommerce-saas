// The admin's one map: sidebar groups, top bar titles and the ⌘K palette.
import {
  ArrowLeftRight, CreditCard, HandCoins, LayoutDashboard, Megaphone, Newspaper, Settings, ShieldCheck, Target, UserCheck, Users, Wallet, type LucideIcon,
} from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  keywords?: string;
}

export const ADMIN_NAV: { label: string; items: AdminNavItem[] }[] = [
  {
    label: "",
    items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true, keywords: "home kpi stats dashboard" }],
  },
  {
    label: "Grow",
    items: [
      { href: "/admin/leads", label: "Leads", icon: Target, keywords: "pipeline unfinished signups upgrade prospects sales" },
      { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone, keywords: "marketing email push announcement broadcast" },
      { href: "/admin/blog", label: "Blog", icon: Newspaper, keywords: "posts articles write publish content seo" },
      { href: "/admin/grants", label: "Vendor Grant", icon: HandCoins, keywords: "grant fund support applications apply round winner" },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/admin/vendors", label: "Vendors", icon: Users, keywords: "stores sellers suspend approve" },
      { href: "/admin/plans", label: "Plans", icon: CreditCard, keywords: "pricing subscription features" },
      { href: "/admin/transfers", label: "Transfers", icon: ArrowLeftRight, keywords: "bank transfer confirm payments" },
      { href: "/admin/duka-pay", label: "Duka Pay", icon: Wallet, keywords: "payouts split paystack" },
      { href: "/admin/affiliates", label: "Affiliates", icon: UserCheck, keywords: "referrals partners" },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/admin/data-requests", label: "Data requests", icon: ShieldCheck, keywords: "privacy deletion gdpr" },
      { href: "/admin/settings", label: "Settings", icon: Settings, keywords: "platform config fees registration" },
    ],
  },
];

export const ADMIN_NAV_ITEMS = ADMIN_NAV.flatMap((g) => g.items);

export function isAdminActive(pathname: string, item: AdminNavItem): boolean {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
}

export function adminTitle(pathname: string): string {
  const m = ADMIN_NAV_ITEMS.filter((i) => isAdminActive(pathname, i)).sort((a, b) => b.href.length - a.href.length)[0];
  if (pathname.startsWith("/admin/campaigns/new")) return "New campaign";
  if (pathname === "/admin/blog/new") return "New post";
  if (/^\/admin\/blog\/[^/]+/.test(pathname)) return "Edit post";
  if (/^\/admin\/vendors\/[^/]+/.test(pathname)) return "Vendor";
  return m?.label ?? "Admin";
}
