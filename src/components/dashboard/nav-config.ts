// One map of the dashboard: the sidebar groups, the top bar's page title
// and the ⌘K palette all read from here.
import {
  BarChart3, Boxes, Rocket, CalendarDays, CreditCard, FileText, Film, FolderTree, Gift, Layout, LayoutDashboard, Package, Palette,
  MessageCircle, ScanBarcode, Settings, Share2, ShoppingBag, ShoppingCart, Star, Tag, Ticket, UserCog, Users, Wallet, type LucideIcon,
} from "lucide-react";
import type { SocialName } from "@/components/SocialIcon";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Extra words the ⌘K palette matches */
  keywords?: string;
  /** Legacy Pro badge for items with no plan feature mapping */
  pro?: boolean;
  /** A small highlight label, e.g. "New" */
  tag?: string;
  /** Brand colour for the icon (add-ons) */
  color?: string;
  /** One plain-English line on what it's for (the mobile Store menu shows it) */
  hint?: string;
  /** Show this brand's real logo instead of the icon (e.g. WhatsApp) */
  social?: SocialName;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    // First thing in the sidebar: add-ons vendors switch on
    label: "Add-ons",
    items: [
      { href: "/dashboard/whatsapp", label: "WhatsApp shop", icon: MessageCircle, social: "whatsapp", hint: "Let customers shop inside WhatsApp", tag: "New", color: "#25D366", keywords: "whatsapp chat bot sell catalog messages wa" },
    ],
  },
  {
    label: "Sell",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard, hint: "Your day at a glance", keywords: "home summary" },
      { href: "/dashboard/growth", label: "Growth", icon: Rocket, tag: "New", hint: "Reach more people and win repeat buyers", keywords: "marketing customers welcome offer pop-up popup list contacts audience share links grow sales" },
      { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag, hint: "See and update customer orders", keywords: "sales delivery" },
      { href: "/dashboard/pos", label: "Point of sale", icon: ScanBarcode, hint: "Record sales in your shop", keywords: "pos till in store" },
      { href: "/dashboard/bookings", label: "Bookings", icon: CalendarDays, hint: "Appointments customers booked", keywords: "appointments calendar" },
      { href: "/dashboard/abandoned", label: "Abandoned carts", icon: ShoppingCart, hint: "People who didn't finish paying", keywords: "recovery checkout" },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, hint: "Sales, visitors and best sellers", keywords: "reports revenue visitors" },
      { href: "/dashboard/earnings", label: "Earnings", icon: Wallet, hint: "Money made and paid to your bank", keywords: "duka pay payouts fees money paystack settlement" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/dashboard/products", label: "Products", icon: Package, hint: "Everything you sell", keywords: "items listings" },
      { href: "/dashboard/inventory", label: "Inventory", icon: Boxes, hint: "How many of each item you have", keywords: "stock" },
      { href: "/dashboard/categories", label: "Categories", icon: FolderTree, hint: "Group products so they're easy to find", keywords: "collections subcategories" },
    ],
  },
  {
    label: "Customers",
    items: [
      { href: "/dashboard/customers", label: "Customers", icon: Users, hint: "Everyone who bought from you", keywords: "buyers contacts" },
      { href: "/dashboard/coupons", label: "Coupons", icon: Tag, hint: "Discount codes for your customers", keywords: "discount codes", pro: true },
      { href: "/dashboard/gift-cards", label: "Gift cards & loyalty", icon: Ticket, hint: "Gift cards and rewards for regulars", keywords: "rewards store credit" },
      { href: "/dashboard/reviews", label: "Reviews", icon: Star, hint: "What customers say about you", keywords: "ratings" },
    ],
  },
  {
    label: "Store",
    items: [
      { href: "/dashboard/storefront", label: "Store page", icon: Layout, hint: "Banners and what shoppers see first", keywords: "banner featured" },
      { href: "/dashboard/themes", label: "Themes", icon: Palette, hint: "Change how your store looks", keywords: "design colours" },
      { href: "/dashboard/pages", label: "Pages & blog", icon: FileText, hint: "About us, FAQs and blog posts", keywords: "about posts" },
      { href: "/dashboard/reels", label: "Reels", icon: Film, hint: "Short videos of your products", keywords: "video", pro: true },
      { href: "/dashboard/channels", label: "Sales channels", icon: Share2, hint: "Show products on Google and Facebook", keywords: "instagram facebook google feed" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/dashboard/billing", label: "Billing", icon: CreditCard, hint: "Your plan and payments to Duka", keywords: "plan subscription upgrade" },
      { href: "/dashboard/team", label: "Team", icon: UserCog, hint: "Give staff their own login", keywords: "staff manager roles" },
      { href: "/dashboard/referral", label: "Refer & earn", icon: Gift, hint: "Invite sellers and earn rewards", keywords: "referral invite" },
      { href: "/dashboard/settings", label: "Settings", icon: Settings, hint: "Payments, delivery, logo and more", keywords: "payments duka pay bank delivery hours domain" },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** Sub-pages that aren't in the sidebar but deserve a proper title. */
const EXTRA_TITLES: [prefix: string, title: string][] = [
  ["/dashboard/me", "Your store"],
  ["/dashboard/products/new", "New product"],
  ["/dashboard/products/", "Edit product"],
];

export function isActiveHref(pathname: string, href: string): boolean {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname === href || pathname.startsWith(href + "/");
}

/** The title for the top bar: the most specific match wins. */
export function pageTitle(pathname: string): { title: string; parent?: NavItem } {
  for (const [prefix, title] of EXTRA_TITLES) {
    if (pathname.startsWith(prefix)) {
      return { title, parent: prefix.startsWith("/dashboard/products") ? NAV_ITEMS.find((i) => i.href === "/dashboard/products") : undefined };
    }
  }
  const match = NAV_ITEMS.filter((i) => isActiveHref(pathname, i.href)).sort((a, b) => b.href.length - a.href.length)[0];
  return { title: match?.label ?? "Dashboard" };
}
