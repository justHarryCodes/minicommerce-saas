// One map of the dashboard: the sidebar groups, the top bar's page title
// and the ⌘K palette all read from here.
import {
  BarChart3, Boxes, CalendarDays, CreditCard, FileText, Film, FolderTree, Gift, Layout, LayoutDashboard, Package, Palette,
  MessageCircle, ScanBarcode, Settings, Share2, ShoppingBag, ShoppingCart, Star, Tag, Ticket, UserCog, Users, Wallet, type LucideIcon,
} from "lucide-react";

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
      { href: "/dashboard/whatsapp", label: "WhatsApp shop", icon: MessageCircle, tag: "New", color: "#25D366", keywords: "whatsapp chat bot sell catalog messages wa" },
    ],
  },
  {
    label: "Sell",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard, keywords: "home summary" },
      { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag, keywords: "sales delivery" },
      { href: "/dashboard/pos", label: "Point of sale", icon: ScanBarcode, keywords: "pos till in store" },
      { href: "/dashboard/bookings", label: "Bookings", icon: CalendarDays, keywords: "appointments calendar" },
      { href: "/dashboard/abandoned", label: "Abandoned carts", icon: ShoppingCart, keywords: "recovery checkout" },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, keywords: "reports revenue visitors" },
      { href: "/dashboard/earnings", label: "Earnings", icon: Wallet, keywords: "duka pay payouts fees money paystack settlement" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/dashboard/products", label: "Products", icon: Package, keywords: "items listings" },
      { href: "/dashboard/inventory", label: "Inventory", icon: Boxes, keywords: "stock" },
      { href: "/dashboard/categories", label: "Categories", icon: FolderTree, keywords: "collections subcategories" },
    ],
  },
  {
    label: "Customers",
    items: [
      { href: "/dashboard/customers", label: "Customers", icon: Users, keywords: "buyers contacts" },
      { href: "/dashboard/coupons", label: "Coupons", icon: Tag, keywords: "discount codes", pro: true },
      { href: "/dashboard/gift-cards", label: "Gift cards & loyalty", icon: Ticket, keywords: "rewards store credit" },
      { href: "/dashboard/reviews", label: "Reviews", icon: Star, keywords: "ratings" },
    ],
  },
  {
    label: "Store",
    items: [
      { href: "/dashboard/storefront", label: "Store page", icon: Layout, keywords: "banner featured" },
      { href: "/dashboard/themes", label: "Themes", icon: Palette, keywords: "design colours" },
      { href: "/dashboard/pages", label: "Pages & blog", icon: FileText, keywords: "about posts" },
      { href: "/dashboard/reels", label: "Reels", icon: Film, keywords: "video", pro: true },
      { href: "/dashboard/channels", label: "Sales channels", icon: Share2, keywords: "instagram facebook google feed" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/dashboard/billing", label: "Billing", icon: CreditCard, keywords: "plan subscription upgrade" },
      { href: "/dashboard/team", label: "Team", icon: UserCog, keywords: "staff manager roles" },
      { href: "/dashboard/referral", label: "Refer & earn", icon: Gift, keywords: "referral invite" },
      { href: "/dashboard/settings", label: "Settings", icon: Settings, keywords: "payments duka pay bank delivery hours domain" },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** Sub-pages that aren't in the sidebar but deserve a proper title. */
const EXTRA_TITLES: [prefix: string, title: string][] = [
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
      return { title, parent: NAV_ITEMS.find((i) => i.href === "/dashboard/products") };
    }
  }
  const match = NAV_ITEMS.filter((i) => isActiveHref(pathname, i.href)).sort((a, b) => b.href.length - a.href.length)[0];
  return { title: match?.label ?? "Dashboard" };
}
