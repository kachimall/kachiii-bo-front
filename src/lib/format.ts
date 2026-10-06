const dateFormat = new Intl.DateTimeFormat("en-AE", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFormat = new Intl.DateTimeFormat("en-AE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** "158.00" + "AED" -> "AED 158.00". Amounts stay strings: no float rounding. */
export function formatMoney(amount: string | null | undefined, currency = "AED"): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  return `${currency} ${amount}`;
}

export function formatPriceRange(range: { min: string | null; max: string | null }, currency: string): string {
  if (!range.min) return "—";
  return range.min === range.max || !range.max
    ? formatMoney(range.min, currency)
    : `${formatMoney(range.min, currency)} – ${range.max}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormat.format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormat.format(date);
}

/** "pending_review" -> "Pending review". */
export function humanize(value: string | null | undefined): string {
  if (!value) return "—";
  const text = value.replace(/[_-]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** "Summer Sale 2026" -> "summer-sale-2026", matching the API's slug rule. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

// UAE time (Gulf Standard Time) is UTC+4 all year: no daylight saving. Schedules (vouchers,
// banners) are entered and shown in it whatever the browser's zone, and sent with the offset;
// the API converts them to UTC.
const UAE_TIME_ZONE = "Asia/Dubai";
const UAE_OFFSET_MS = 4 * 60 * 60_000;

const uaeDateFormat = new Intl.DateTimeFormat("en-AE", { day: "numeric", month: "short", year: "numeric", timeZone: UAE_TIME_ZONE });
const uaeDateTimeFormat = new Intl.DateTimeFormat("en-AE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: UAE_TIME_ZONE,
});

/** A date in UAE time, e.g. "10 Oct 2026". */
export function formatUaeDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : uaeDateFormat.format(date);
}

/** A date and time in UAE time. */
export function formatUaeDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : uaeDateTimeFormat.format(date);
}

/** ISO string -> value for <input type="datetime-local"> in UAE time. */
export function toUaeInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() + UAE_OFFSET_MS).toISOString().slice(0, 16);
}

/** <input type="datetime-local"> value, read as UAE time -> ISO string with "+04:00". */
export function fromUaeInput(value: string): string {
  return `${value.slice(0, 16)}:00+04:00`;
}

/** A shipping/delivery address object as lines; the API leaves its shape open. */
export function addressLines(address: Record<string, unknown> | null | undefined): string[] {
  if (!address) return [];
  const order = ["recipient_name", "phone", "unit", "building", "street", "area", "landmark", "emirate"];
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const key of [...order, ...Object.keys(address)]) {
    if (seen.has(key) || !(key in address) || key === "label") continue;
    seen.add(key);
    const value = address[key];
    if (value === null || value === undefined || value === "" || typeof value === "object") continue;
    lines.push(String(value));
  }
  return lines;
}

/** Variant option values as text: {"Colour": "Red", "Size": "M"} -> "Colour: Red · Size: M". */
export function formatOptions(options: Record<string, string> | string | null | undefined): string {
  if (!options) return "Default";
  if (typeof options === "string") return options || "Default";
  const parts = Object.entries(options).map(([name, value]) => `${name}: ${value}`);
  return parts.length > 0 ? parts.join(" · ") : "Default";
}

export function crumbName(crumb: { name: string } | string): string {
  return typeof crumb === "string" ? crumb : crumb.name;
}
