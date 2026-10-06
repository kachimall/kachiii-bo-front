import {
  BadgePercentIcon,
  BoxesIcon,
  FileSignatureIcon,
  FolderTreeIcon,
  ImagesIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  PackageIcon,
  PackageXIcon,
  PercentIcon,
  ReceiptIcon,
  Undo2Icon,
  SettingsIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  StoreIcon,
  TagIcon,
  UserCogIcon,
  UsersIcon,
  ListChecksIcon,
  WalletIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown when the user holds any of these permissions; none means everyone. */
  permission?: string | string[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: "General",
    items: [{ href: "/", label: "Overview", icon: LayoutDashboardIcon }],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/products", label: "Products", icon: PackageIcon, permission: "products.view" },
      { href: "/inventory/low-stock", label: "Low stock", icon: PackageXIcon, permission: "products.view" },
      { href: "/categories", label: "Categories", icon: FolderTreeIcon, permission: "products.view" },
      { href: "/brands", label: "Brands", icon: TagIcon, permission: "products.view" },
      { href: "/attributes", label: "Attributes", icon: ListChecksIcon, permission: "products.view" },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/orders", label: "Orders", icon: ShoppingCartIcon, permission: "orders.view" },
      { href: "/returns", label: "Returns", icon: Undo2Icon, permission: "orders.view" },
      { href: "/vouchers", label: "Vouchers", icon: BadgePercentIcon, permission: "promotions.view" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/refunds", label: "Refunds", icon: ReceiptIcon, permission: "payments.view" },
      { href: "/commission-rates", label: "Commission", icon: PercentIcon, permission: "commissions.view" },
      { href: "/payouts", label: "Payouts", icon: WalletIcon, permission: "payouts.view" },
    ],
  },
  {
    label: "Content",
    items: [{ href: "/banners", label: "Banners", icon: ImagesIcon, permission: "content.view" }],
  },
  {
    label: "Marketplace",
    items: [
      { href: "/vendors", label: "Vendors", icon: BoxesIcon, permission: "vendors.view" },
      { href: "/stores", label: "Stores", icon: StoreIcon, permission: "vendors.view" },
      { href: "/vendor-agreements", label: "Vendor agreements", icon: FileSignatureIcon, permission: "content.view" },
      { href: "/buyers", label: "Buyers", icon: UsersIcon, permission: "customers.view" },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/staff", label: "Staff", icon: UserCogIcon, permission: "admins.manage" },
      { href: "/roles", label: "Roles", icon: ShieldCheckIcon, permission: "permissions.manage" },
      { href: "/settings", label: "Settings", icon: SettingsIcon, permission: "settings.view" },
    ],
  },
];

export function visibleNav(can: (permission: string | string[]) => boolean): NavGroup[] {
  return NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || can(item.permission)),
  })).filter((group) => group.items.length > 0);
}
