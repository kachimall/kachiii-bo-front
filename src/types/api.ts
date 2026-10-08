// Types for the KACHI admin API (GET /docs/admin.json). IDs are ULIDs, money is a decimal
// string ("158.00") alongside a currency_code, and timestamps are ISO 8601 strings.

export type Ulid = string;
export type Money = string;
export type IsoDate = string;

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

export type FieldErrors = Record<string, string[]>;

export interface Envelope<T, M = Record<string, unknown>> {
  success: boolean;
  message: string;
  data: T;
  meta: M;
}

export interface PageMeta {
  current_page: number;
  per_page: number;
  has_more: boolean;
  total?: number;
  last_page?: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type UserStatus = "active" | "inactive" | "suspended";
export type VendorStatus =
  | "pending"
  | "awaiting_consent"
  | "approved"
  | "rejected"
  | "suspended"
  | "terminated";
export type BusinessType =
  | "individual"
  | "sole_establishment"
  | "civil_company"
  | "llc"
  | "free_zone_company"
  | "branch";
export type StoreStatus = "active" | "inactive" | "suspended";
export type ProductStatus =
  | "draft"
  | "pending_review"
  | "rejected"
  | "active"
  | "inactive"
  | "archived"
  | "banned";
export type ModerationStatus = "active" | "rejected" | "banned" | "inactive";
export type ProductVariantStatus = "active" | "inactive" | "archived";
export type ProductImageStatus = "processing" | "ready" | "failed";
export type TaxClass = "standard" | "zero_rated" | "exempt";
export type InventoryMovementType =
  | "purchase"
  | "sale"
  | "reservation"
  | "release"
  | "return"
  | "adjustment"
  | "cancellation";
export type PurchaseStatus = "pending" | "placed" | "cancelled";
export type PaymentMethod = "online" | "cash_on_delivery";
export type PaymentStatus = "unpaid" | "paid" | "due_on_delivery";
export type PaymentAttemptStatus = "pending" | "succeeded" | "failed";
export type VendorOrderStatus =
  | "pending"
  | "placed"
  | "accepted"
  | "ready_to_ship"
  | "shipped"
  | "delivered"
  | "returned"
  | "cancelled";
export type CancelledBy = "buyer" | "vendor" | "staff" | "system";
export type ShipmentStatus = "pending" | "processing" | "ready" | "shipped" | "delivered" | "returned" | "cancelled";
/** What the courier (Zajel) reports. Not one-way: a failed attempt goes back out; delivered and returned are final. */
export type CourierStatus = "picked_up" | "in_transit" | "out_for_delivery" | "delivery_failed" | "delivered" | "returned";
export type CodStatus = "pending" | "collected" | "not_collected";
export type Fulfiller = "vendor" | "provider";
/** "pending" and "processing" until paid back; "failed" waits for staff to try again. */
export type RefundStatus = "pending" | "processing" | "succeeded" | "failed";
/** Who bears a refund in the payouts. */
export type RefundCharge = "vendor" | "kachi";
/** "escalated": KACHI decides (the store did not answer in time, or the buyer disputed its rejection). */
export type ReturnStatus = "requested" | "escalated" | "approved" | "rejected" | "received" | "withdrawn";
export type ReturnDecision = "approved" | "rejected";
export type ReturnReason = "damaged" | "defective" | "wrong_item" | "not_as_described" | "missing_parts" | "other";
export type VendorDocumentType = "trade_license" | "vat_certificate" | "other";
export type VoucherFunder = "kachi" | "vendor";
export type VoucherType = "fixed" | "percentage";
export type VoucherState = "off" | "scheduled" | "ended" | "running";
export type AccessLevel = "view" | "change";
/** Where a home banner shows: the home page's main slider, or the promo cards beside it on a wide screen. */
export type BannerPlacement = "home_carousel" | "home_side";
export type BannerStatus = "off" | "scheduled" | "live" | "ended";
/** A sale (a delivered package), items sent back, or a refund charged to the store. */
export type LedgerEntryType = "sale" | "return" | "refund";
/** "pending" during the return period (payout_hold_days after delivery), then "available". */
/** "pending" during the return period, then "available", then "released" once in a payout. */
export type LedgerEntryStatus = "pending" | "available" | "released";

/**
 * A variant's option values. The spec says string; the API sends an object such as
 * {"Colour": "Red", "Size": "M"} ({} for a single-variant product).
 */
export type VariantOptions = Record<string, string> | string;

/** The spec says string[]; the API sends {id, name, slug} objects, root first. */
export interface Crumb {
  id: Ulid;
  name: string;
  slug: string;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface User {
  id: Ulid;
  name: string;
  email: string;
  phone: string | null;
  status: UserStatus;
  email_verified: boolean;
  roles?: string[];
  permissions?: string[];
  two_factor?: { enabled: boolean; required: boolean };
  vendor?: { id: Ulid; status: VendorStatus };
  created_at: IsoDate | null;
}

export interface TokenResult {
  user: User;
  token: string;
  expires_at: IsoDate;
}

export interface TwoFactorPending {
  two_factor: true;
  challenge_token: string;
}

export type LoginResult = TokenResult | TwoFactorPending;

export interface TwoFactorStatus {
  enabled: boolean;
  required: boolean;
  recovery_codes_left: number | null;
}

export interface TwoFactorSetup {
  secret: string;
  otpauth_url: string;
}

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export interface Category {
  id: Ulid;
  name: string;
  slug: string;
  image_url: string | null;
  depth: number;
  position: number;
  breadcrumbs?: (Crumb | string)[];
  children?: Category[];
  is_active?: boolean;
  parent_id?: Ulid | null;
}

export interface Brand {
  id: Ulid;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active?: boolean;
}

export interface CatalogAttribute {
  id: Ulid;
  name: string;
  is_active: boolean;
  position: number;
}

export interface Inventory {
  on_hand: number;
  reserved: number;
  available: number;
  low_stock_threshold: number;
  is_low_stock: boolean;
  variant?: { id: Ulid; sku: string; seller_sku: string | null; options: VariantOptions };
  product?: { id: Ulid; name: string; status: ProductStatus };
}

export interface InventoryMovement {
  type: InventoryMovementType;
  quantity: number;
  on_hand_before: number;
  on_hand_after: number;
  reserved_before: number;
  reserved_after: number;
  note: string | null;
  reference_type: string | null;
  created_by: { id?: Ulid; name: string } | null;
  created_at: IsoDate;
}

export interface ProductImage {
  id: Ulid;
  status: ProductImageStatus;
  url: string | null;
  thumbnail_url: string | null;
  position: number;
  alt_text: string | null;
  width: number | null;
  height: number | null;
}

export interface ProductOption {
  id: Ulid;
  name: string;
  position: number;
  values: { id: Ulid; value: string; position: number }[];
}

export interface ProductVariant {
  id: Ulid;
  sku: string;
  options: VariantOptions;
  price: Money;
  sale_price: Money | null;
  effective_price: Money;
  currency_code: string;
  weight_grams: number;
  /** null when no dimensions were given (the spec says always an object). */
  dimensions_mm: { length: number | null; width: number | null; height: number | null } | null;
  image_id: Ulid | null;
  stock: number;
  seller_sku?: string | null;
  status?: ProductVariantStatus;
  position?: number;
  inventory?: Inventory;
}

export interface Product {
  id: Ulid;
  name: string;
  slug: string;
  sku: string;
  currency_code: string;
  price_range: { min: Money | null; max: Money | null };
  in_stock: boolean;
  thumbnail_url: string | null;
  store: { id: Ulid; name: string; slug: string };
  description?: string;
  metadata?: { name: string; value: string }[];
  tax_class?: TaxClass;
  published_at?: IsoDate | null;
  category?: { id: Ulid; name: string; slug: string; breadcrumbs: (Crumb | string)[] };
  brand?: { id: Ulid; name: string; slug: string } | null;
  options?: ProductOption[];
  variants?: ProductVariant[];
  images?: ProductImage[];
  status?: ProductStatus;
  ships_from_provider?: boolean;
  moderation_reason?: string | null;
  approved_at?: IsoDate | null;
  submitted_at?: IsoDate | null;
  archived_at?: IsoDate | null;
  created_at?: IsoDate | null;
  updated_at?: IsoDate | null;
  stock_on_hand?: number;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export interface OrderItem {
  id: Ulid;
  package_id: Ulid;
  product: { id: Ulid; name: string };
  variant: { id: Ulid; sku: string; options: VariantOptions };
  thumbnail_url: string | null;
  unit_price: Money;
  compare_at_price: Money | null;
  quantity: number;
  line_total: Money;
  discount_amount: Money;
  tax_rate: string;
  tax_amount: Money;
  commission_rate?: string;
  commission_amount?: Money;
}

export interface Shipment {
  id: Ulid;
  fulfiller: Fulfiller;
  status: ShipmentStatus;
  order_id: Ulid | null;
  service: { code: string; name: string };
  fee: Money;
  min_days: number;
  max_days: number;
  weight_grams: number;
  ready_at: IsoDate | null;
  shipped_at: IsoDate | null;
  delivered_at: IsoDate | null;
  /** Until when its items can be returned; null until delivered. */
  return_by: IsoDate | null;
  /** Brought back undelivered by the courier, and when its sender confirmed it is back. */
  returned_at: IsoDate | null;
  received_back_at: IsoDate | null;
  cancelled_at: IsoDate | null;
  /** The courier's tracking number, once booked. */
  waybill_number: string | null;
  courier_status: CourierStatus | null;
  /** What the courier collects; null when paid online. */
  cash_on_delivery: { amount: Money; status: CodStatus; collected_at: IsoDate | null } | null;
  /** Courier updates, oldest first. */
  tracking?: { status: CourierStatus; description: string | null; reason: string | null; occurred_at: IsoDate }[];
  booked_at?: IsoDate | null;
  /** The label can be downloaded (GET …/packages/{id}/waybill). */
  waybill_ready?: boolean;
  quoted_fee?: Money;
}

export type Address = Record<string, unknown>;

export interface VendorOrder {
  id: Ulid;
  number: string;
  status: VendorOrderStatus;
  store: { id: Ulid; name: string; slug: string };
  items_total: Money;
  discount_total: Money;
  items: OrderItem[];
  placed_at: IsoDate | null;
  ship_by: IsoDate | null;
  accepted_at: IsoDate | null;
  ready_at: IsoDate | null;
  shipped_at: IsoDate | null;
  delivered_at: IsoDate | null;
  returned_at: IsoDate | null;
  cancelled_at: IsoDate | null;
  cancelled_by: CancelledBy | null;
  cancel_reason: string | null;
  refund_amount: Money;
  purchase?: { number: string; payment_method: PaymentMethod; payment_status: PaymentStatus };
  delivery_address?: Address;
  package?: Shipment | null;
  commission_total?: Money;
  earnings?: Money;
}

export interface PaymentRecord {
  id: Ulid;
  status: PaymentAttemptStatus;
  amount: Money;
  reference: string | null;
  failure_reason: string | null;
  split: Record<string, unknown>[];
  paid_at: IsoDate | null;
  failed_at: IsoDate | null;
  created_at: IsoDate | null;
}

export interface Purchase {
  id: Ulid;
  number: string;
  status: PurchaseStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  currency_code: string;
  items_total: Money;
  voucher_code: string | null;
  discount_total: Money;
  shipping_total: Money;
  grand_total: Money;
  shipping_address: Address;
  contact_email: string;
  pay_by: IsoDate | null;
  payment: {
    id: Ulid;
    status: PaymentAttemptStatus;
    redirect_url: string | null;
    failure_reason: string | null;
  } | null;
  orders: VendorOrder[];
  packages: Shipment[];
  /** Money owed back to the buyer; loaded on the order detail. */
  refunds?: Refund[];
  placed_at: IsoDate | null;
  paid_at: IsoDate | null;
  cancelled_at: IsoDate | null;
  cancel_reason: string | null;
  created_at: IsoDate | null;
  buyer?: { id: Ulid; name: string; email: string };
  payment_failures?: number;
  flagged_at?: IsoDate | null;
  payments?: PaymentRecord[];
}

export interface Refund {
  id: Ulid;
  amount: Money;
  reason: string;
  status: RefundStatus;
  refunded_at: IsoDate | null;
  created_at: IsoDate | null;
  order?: { id: Ulid; number: string };
  /** The store's order number, when one store's order is refunded. */
  store_order?: string | null;
  /** "cash_on_delivery": KACHI pays it back itself, then records it with its own reference (FN9). */
  payment_method?: PaymentMethod;
  /** null when nothing was earned yet. */
  charged_to?: RefundCharge | null;
  reference?: string | null;
  attempts?: number;
  failure_reason?: string | null;
  failed_at?: IsoDate | null;
}

export interface ReturnAnswer {
  decision: ReturnDecision;
  remarks: string | null;
  decided_at: IsoDate | null;
}

export interface ReturnRequest {
  id: Ulid;
  number: string;
  status: ReturnStatus;
  order: { id: Ulid; number: string };
  store_order: { id: Ulid; number: string; store_name: string };
  /** The package the items came in. */
  package_id: Ulid;
  reason: ReturnReason;
  details: string | null;
  /** Portal paths of the buyer's photos (WebP); they need the bearer token. */
  photos: string[];
  items: {
    item_id: Ulid;
    product_name: string;
    sku: string;
    options: Record<string, string>;
    thumbnail_url: string | null;
    quantity: number;
    refund_amount: Money;
  }[];
  /** What the buyer gets back once the items are back; final once received. */
  refund_amount: Money;
  /** The store answers by then, or KACHI decides. */
  reply_by: IsoDate | null;
  store_answer: ReturnAnswer | null;
  escalated_at: IsoDate | null;
  /** The buyer's reason for asking KACHI to review the store's rejection. */
  dispute_reason: string | null;
  dispute_by: IsoDate | null;
  kachi_decision: ReturnAnswer | null;
  /** The courier's pickup, once booked. */
  pickup: {
    waybill_number: string;
    booked_at: IsoDate | null;
    cancelled_at: IsoDate | null;
    courier_status: CourierStatus | null;
    courier_status_at: IsoDate | null;
  } | null;
  received_at: IsoDate | null;
  /** Whether the items went back on sale; null until received. */
  restocked: boolean | null;
  withdrawn_at: IsoDate | null;
  created_at: IsoDate | null;
  buyer?: { id: Ulid; name: string; email: string };
  decided_by?: string | null;
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export interface Buyer {
  id: Ulid;
  name: string;
  email: string;
  phone: string | null;
  status: UserStatus;
  email_verified: boolean;
  /** Switched off after the admin-set number of refused parcels, or by staff. */
  cash_on_delivery?: { allowed: boolean; blocked_at: IsoDate | null; refused_parcels: number };
  created_at: IsoDate | null;
}

export interface Store {
  id: Ulid;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  policies: string | null;
  joined_at: IsoDate | null;
  products_count?: number;
  status?: StoreStatus;
  status_reason?: string | null;
  vendor?: { id: Ulid; status: VendorStatus; business_name: string };
}

export interface VendorDocument {
  id: Ulid;
  type: VendorDocumentType;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: IsoDate | null;
}

export interface VendorConsent {
  id: Ulid;
  agreement?: { id: Ulid; version: number; title: string };
  accepted_at: IsoDate;
  accepted_by?: { id: Ulid; name: string; email: string };
  ip_address: string | null;
  user_agent: string | null;
  copy_ready: boolean;
}

export interface Vendor {
  id: Ulid;
  code: string | null;
  status: VendorStatus;
  status_reason: string | null;
  business_name: string;
  business_type: BusinessType;
  /** Masked everywhere except GET /vendors/{id}/tax-id. */
  tax_id: string | null;
  is_vat_registered: boolean;
  contact_phone: string;
  contact_email: string | null;
  revision: number;
  submitted_at: IsoDate;
  approved_at: IsoDate | null;
  agreement_link_expires_at?: IsoDate | null;
  documents?: VendorDocument[];
  consent?: VendorConsent | null;
  store: Store | null;
  user?: User;
}

export interface VendorAgreement {
  id: Ulid;
  version: number;
  title: string;
  body: string;
  published_at: IsoDate | null;
}

export interface Staff {
  id: Ulid;
  name: string;
  email: string;
  status: UserStatus;
  role?: { id: Ulid; name: string } | null;
  two_factor?: { enabled: boolean; required: boolean };
  created_at: IsoDate | null;
}

export const ADMIN_SECTIONS = [
  "vendors",
  "products",
  "orders",
  "finance",
  "reports",
  "content",
  "promotions",
  "ads",
  "messages",
  "buyers",
  "settings",
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];
export type SectionGrants = Record<AdminSection, AccessLevel | null>;

export interface StaffRole {
  id: Ulid;
  name: string;
  sections: SectionGrants;
  requires_two_factor: boolean;
  staff_count?: number;
  created_at: IsoDate | null;
  updated_at: IsoDate | null;
}

/** meta.sections of GET /admin/roles: what each section offers. */
export interface SectionInfo {
  key: AdminSection;
  name: string;
  levels: AccessLevel[];
}

// ---------------------------------------------------------------------------
// Promotions & settings
// ---------------------------------------------------------------------------

export interface Voucher {
  id: Ulid;
  code: string;
  name: string;
  funded_by: VoucherFunder;
  store: { id: Ulid; name: string } | null;
  type: VoucherType;
  value: Money;
  max_discount: Money | null;
  min_spend: Money;
  starts_at: IsoDate;
  ends_at: IsoDate;
  usage_limit: number | null;
  usage_limit_per_buyer: number;
  is_active: boolean;
  status: VoucherState;
  uses?: number;
  created_at: IsoDate | null;
}

/** GET /admin/settings. The spec types `data` as an array; it is a keyed object. */
export interface Settings {
  unpaid_order_minutes: number;
  ship_deadline_days: number;
  cash_on_delivery_enabled: boolean;
  cash_on_delivery_max_total: Money;
  delivery_fee_mode: "courier" | "flat";
  delivery_flat_fee: Money;
  free_delivery_min_total: Money | null;
  /** Refused cash-on-delivery parcels before cash on delivery switches off for a buyer (1–10). */
  cod_refusal_limit: number;
  /** Days after delivery a buyer may ask to return items (1–90). */
  return_days: number;
  /** Days the store has to answer a return request before KACHI decides it (1–14). */
  return_reply_days: number;
  /** Days the buyer has to ask KACHI to review the store's rejection (1–30). */
  return_dispute_days: number;
  /** Read-only here: changed at PATCH /admin/payout-settings (payouts.manage). */
  payout_hold_days?: number;
  /** KACHI's trading name, on receipts and as its emails' sender. */
  store_name: string;
  legal_name: string | null;
  address: string | null;
  /** Tax registration number: 15 digits. */
  trn: string | null;
  support_email: string | null;
  support_phone: string | null;
  /** In percent ("5.00"). */
  vat_rate: string;
  /** At least one of online payment and cash on delivery stays on. */
  online_payment_enabled: boolean;
  /** Where replies to KACHI's emails go; null for nowhere. */
  email_reply_to: string | null;
}

/** GET /admin/payout-settings. */
export interface PayoutSettings {
  /** Days after delivery before a sale counts towards a payout (0–30). Recorded sales keep their date. */
  payout_hold_days: number;
}

/** A home banner as staff manage it (DECISIONS CN1). Times are UTC ISO strings. */
export interface Banner {
  id: Ulid;
  placement: BannerPlacement;
  /** Staff's own name for it; never shown in the shop. */
  name: string;
  alt_text: string;
  headline: string | null;
  subheadline: string | null;
  button_label: string | null;
  /** A path in the shop ("/categories/shoes") or an https:// address. */
  link_url: string | null;
  desktop_image_url: string | null;
  /** The shop falls back to the desktop image without one. */
  mobile_image_url: string | null;
  starts_at: IsoDate | null;
  ends_at: IsoDate | null;
  show_countdown: boolean;
  is_active: boolean;
  position: number;
  status: BannerStatus;
  created_at: IsoDate | null;
  updated_at: IsoDate | null;
}

/** GET /admin/vendors/{id}/earnings/summary: totals net of returns and refunds. */
export interface EarningsSummary {
  earned: Money;
  commission: Money;
  /** Waits for the end of the return period. */
  pending: Money;
  /** Counts towards the next payout. */
  available: Money;
  /** Already in payouts. */
  released?: Money;
  /** Not in a payout yet: pending + available. */
  outstanding?: Money;
  /** The store's share of its cash-on-delivery orders, which KACHI pays it outside the platform. */
  cash_on_delivery?: { earned: Money; paid: Money; due: Money };
}

/** One change to what a store is owed (DECISIONS FN6); the ledger is append-only. */
export interface LedgerEntry {
  id: Ulid;
  type: LedgerEntryType;
  order_number: string;
  return_number: string | null;
  /** What the store earns after commission; negative when it gives money back. */
  amount: Money;
  /** Who pays it out: noqodi from the payment split, or KACHI (cash on delivery, its own vouchers). */
  paid_by: { noqodi: Money; kachi: Money };
  commission: Money;
  available_at: IsoDate;
  status: LedgerEntryStatus;
  /** The payout it was released in. */
  payout_number?: string | null;
  created_at: IsoDate | null;
}

/** GET /admin/commission-rates: the default, and the categories and vendors with their own rate. */
export interface CommissionRates {
  default: string;
  categories: { id: Ulid; name: string; rate: string }[];
  vendors: { id: Ulid; business_name: string; store: string | null; rate: string }[];
}

// ---------------------------------------------------------------------------
// Dashboard & reports (DECISIONS RP1–RP3)
// ---------------------------------------------------------------------------

/** GET /admin/dashboard, over UAE days. A figure is null for staff who cannot view its section. */
export interface Dashboard {
  from: string;
  to: string;
  /** The sales report's totals. */
  sales: { orders: number; units: number; sales: Money; discounts: Money; net_sales: Money } | null;
  /** Checkouts placed, by how they pay, and the stores' orders in them by where each one is now. */
  orders: { placed: number; online: number; cash_on_delivery: number; store_orders: Record<string, number> } | null;
  /** Packages by what the courier last reported; awaiting_pickup: not with the courier yet. */
  deliveries: Record<string, number> | null;
  /** The payouts report's totals. */
  settlements: Record<string, string | number | null> | null;
  /** The commissions report's totals. */
  commissions: { on_sales: Money; on_returns: Money; net: Money } | null;
  vendors: { active: number; selling: number; approved: number; to_review: number } | null;
  buyers: { registered: number; new: number; ordering: number } | null;
}

export type ReportKey = "sales" | "commissions" | "best-sellers" | "payouts" | "vouchers" | "ad-sales" | "cash-on-delivery";

/** GET /admin/reports/{report}: rows keyed by the columns' keys. */
export interface Report {
  report: ReportKey;
  name: string;
  from: string;
  to: string;
  group_by?: string;
  limit?: number;
  columns: { key: string; heading: string }[];
  rows: Record<string, string | number | null>[];
  /** null for reports whose columns cannot be added up. */
  totals: Record<string, string | number | null> | null;
}

// ---------------------------------------------------------------------------
// Audit log (DECISIONS AL1)
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
  id: number;
  log: string | null;
  /** e.g. "auth.login", "refund.kachi_paid". */
  event: string;
  /** null for what the platform did by itself. */
  by: { id: Ulid; name: string; email: string } | null;
  /** id is null once the record no longer exists. */
  subject: { type: string; id: string | number | null } | null;
  ip: string | null;
  user_agent: string | null;
  request_id: string | null;
  /** What the action recorded with it: a reason, an amount, a reference. */
  details: Record<string, unknown> | null;
  /** A record's changed fields: their new values and the old ones. */
  changes: Record<string, unknown> | null;
  created_at: IsoDate;
}

// ---------------------------------------------------------------------------
// Reviews & messages (DECISIONS RV1, MS1–MS3)
// ---------------------------------------------------------------------------

export interface Review {
  id: Ulid;
  rating: number;
  comment: string | null;
  photo_urls: string[];
  /** The buyer's first name and last initial, e.g. "Sarah L.". */
  author: string;
  /** What they bought, e.g. "Red / M". */
  variant: string | null;
  reply: { text: string; replied_at: IsoDate } | null;
  created_at: IsoDate;
  product: { id: Ulid; name: string };
  hidden: boolean;
  hidden_reason: string | null;
}

export type MessageSender = "buyer" | "store";

export interface Message {
  id: Ulid;
  sender: MessageSender;
  /** "welcome" or "away" when the store's settings sent it by themselves. */
  auto_reply: string | null;
  body: string | null;
  /** Portal paths of its photos (WebP); they need the bearer token. */
  photos: string[];
  hidden: boolean;
  hidden_reason: string | null;
  sent_at: IsoDate;
}

export interface Conversation {
  id: Ulid;
  store: { id: Ulid; name: string; slug: string; logo_url: string | null };
  buyer: { id: Ulid; name: string };
  last_message: Message | null;
  last_message_at: IsoDate | null;
}

// ---------------------------------------------------------------------------
// Content: email templates and static pages (DECISIONS CN2, CN3)
// ---------------------------------------------------------------------------

export interface EmailTemplateSummary {
  key: string;
  name: string;
  /** Who gets it, e.g. "buyer" or "vendor". */
  recipient: string;
  subject: string;
  /** Staff changed its wording. */
  customized: boolean;
  updated_at: IsoDate | null;
}

export interface EmailTemplate extends EmailTemplateSummary {
  body: string;
  /** Its button's label (not editable); null for an email without one. */
  button: string | null;
  default: { subject: string; body: string };
  placeholders: { name: string; description: string; sample: string }[];
}

export interface EmailPreview {
  subject: string;
  /** The email as mail apps show it. */
  html: string;
}

export interface StaticPage {
  /** "terms", "privacy", "returns" or "contact". */
  key: string;
  title: string;
  /** Markdown. */
  body: string;
  is_published: boolean;
  updated_at: IsoDate | null;
}

// ---------------------------------------------------------------------------
// Ads (DECISIONS AD1–AD3)
// ---------------------------------------------------------------------------

export type AdPlacementKey = "home" | "category" | "search";
export type AdStatus = "pending_approval" | "approved" | "live" | "ended" | "rejected" | "cancelled" | "expired" | "stopped";

export interface AdPlacementTerms {
  key: AdPlacementKey;
  name: string;
  weekly_price: Money;
  /** How many of its live ads show at once, taking turns (1–20). */
  shown_at_once: number;
  /** Off: no new bookings; live ads run on. */
  is_active: boolean;
}

export interface Ad {
  id: Ulid;
  number: string;
  status: AdStatus;
  placement: { key: AdPlacementKey; name: string };
  /** null for an ad for the whole store. */
  product: { id: Ulid; name: string } | null;
  store: { id: Ulid; name: string; slug: string };
  weeks: number;
  amount: Money;
  currency_code: string;
  approved_at: IsoDate | null;
  pay_by: IsoDate | null;
  rejected_at: IsoDate | null;
  rejection_reason: string | null;
  cancelled_at: IsoDate | null;
  /** The latest attempt to pay for it; null before the first. */
  payment: { id: Ulid; status: PaymentAttemptStatus; redirect_url: string | null; failure_reason: string | null } | null;
  paid_at: IsoDate | null;
  starts_at: IsoDate | null;
  ends_at: IsoDate | null;
  stopped_at: IsoDate | null;
  stop_reason: string | null;
  ended_at: IsoDate | null;
  views: number;
  clicks: number;
  created_at: IsoDate;
}

// ---------------------------------------------------------------------------
// Cash on delivery from Zajel (DECISIONS FN8)
// ---------------------------------------------------------------------------

export interface CodPackage {
  id: Ulid;
  order_number: string;
  waybill_number: string | null;
  /** What the courier collected at the door. */
  cod_amount: Money;
  collected_at: IsoDate | null;
}

export interface CodRemittance {
  id: Ulid;
  reference: string;
  remitted_at: IsoDate;
  /** The cash its packages collected, what reached KACHI, and what Zajel kept (its fee). */
  collected_total: Money;
  amount: Money;
  fee: Money;
  note: string | null;
  packages?: CodPackage[];
  created_at: IsoDate | null;
}
