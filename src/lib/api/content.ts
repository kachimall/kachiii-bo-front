import { api } from "@/lib/api/client";
import { imageBody, type ImageInput } from "@/lib/api/images";
import type { Banner, BannerPlacement, EmailPreview, EmailTemplate, EmailTemplateSummary, StaticPage } from "@/types/api";

// Home banners (DECISIONS CN1). GET lists every banner, placement by placement, in shop order
// (not paginated). A new banner goes last in its placement, switched off; it can be switched on
// once it has its desktop image. At most 10 per placement (409).
export interface BannerInput {
  placement: BannerPlacement;
  name: string;
  alt_text: string;
  headline?: string | null;
  subheadline?: string | null;
  button_label?: string | null;
  /** A path in the shop ("/categories/shoes") or an https:// address. */
  link_url?: string | null;
  /** ISO with an offset ("2026-10-10T00:00:00+04:00"); without one the API reads UTC. */
  starts_at?: string | null;
  ends_at?: string | null;
  /** Needs an end. */
  show_countdown?: boolean;
  is_active?: boolean;
}

export type BannerImageKind = "desktop" | "mobile";

export const listBanners = (placement?: BannerPlacement) =>
  api<Banner[]>("/admin/banners", { query: { placement } });
export const getBanner = (id: string) => api<Banner>(`/admin/banners/${id}`);
export const createBanner = (body: BannerInput) => api<Banner>("/admin/banners", { method: "POST", body });
/** Only the fields sent change; a banner moved to another placement goes last there. */
export const updateBanner = (id: string, body: Partial<BannerInput>) =>
  api<Banner>(`/admin/banners/${id}`, { method: "PATCH", body });
export const deleteBanner = (id: string) => api<null>(`/admin/banners/${id}`, { method: "DELETE" });
/** Lists every banner of the placement exactly once, first to last; answers with them in the new order. */
export const reorderBanners = (placement: BannerPlacement, banners: string[]) =>
  api<Banner[]>("/admin/banners/order", { method: "PUT", body: { placement, banners } });
/** Desktop: 1200×400 to 5000×5000 px; mobile: 600×400 to 5000×5000 px; up to 5 MB. */
export const uploadBannerImage = (id: string, kind: BannerImageKind, image: ImageInput) =>
  api<Banner>(`/admin/banners/${id}/images/${kind}`, { method: "POST", body: imageBody(image) });
/** A switched-on banner keeps its desktop image (409). */
export const deleteBannerImage = (id: string, kind: BannerImageKind) =>
  api<Banner>(`/admin/banners/${id}/images/${kind}`, { method: "DELETE" });

// Email templates (DECISIONS CN2): content.view lists, shows and previews; content.manage saves or
// resets. Plain text using only the email's placeholders, e.g. {order_number}; a body may put
// {button} on a line of its own where the button goes.
export const listEmailTemplates = () => api<EmailTemplateSummary[]>("/admin/email-templates");
export const getEmailTemplate = (key: string) => api<EmailTemplate>(`/admin/email-templates/${key}`);
/** Subject up to 200 characters, body up to 5,000. */
export const saveEmailTemplate = (key: string, body: { subject: string; body: string }) =>
  api<EmailTemplate>(`/admin/email-templates/${key}`, { method: "PUT", body });
/** Puts the default wording back. */
export const resetEmailTemplate = (key: string) => api<EmailTemplate>(`/admin/email-templates/${key}`, { method: "DELETE" });
/** The email with each placeholder's sample; parts left out use the saved wording. */
export const previewEmailTemplate = (key: string, body: { subject?: string; body?: string }) =>
  api<EmailPreview>(`/admin/email-templates/${key}/preview`, { method: "POST", body });

// Static pages (DECISIONS CN3): terms, privacy, returns policy and contact. The shop has a change
// within five minutes.
export const listPages = () => api<StaticPage[]>("/admin/pages");
export const getPage = (key: string) => api<StaticPage>(`/admin/pages/${key}`);
/** Title 3–120 characters, body Markdown up to 50,000. */
export const savePage = (key: string, body: { title: string; body: string; is_published: boolean }) =>
  api<StaticPage>(`/admin/pages/${key}`, { method: "PUT", body });
