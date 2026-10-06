import { z } from "zod";

// A path in the shop (never "//", another site's protocol-relative address) or an https:// address.
const LINK = /^(?:\/(?!\/)\S*|https:\/\/\S+)$/;

const optionalText = (max: number, message: string) => z.string().trim().max(max, message);

/** SaveBannerRequest, including its cross-field rules (after()). Times are UAE datetime-local values. */
export const bannerSchema = z
  .object({
    placement: z.enum(["home_carousel", "home_side"]),
    name: z.string().trim().min(1, "Enter a name staff will know it by.").max(100, "Keep the name under 100 characters."),
    alt_text: z
      .string()
      .trim()
      .min(1, "Describe the picture for screen readers.")
      .max(150, "Keep the alt text under 150 characters."),
    headline: optionalText(100, "Keep the headline under 100 characters."),
    subheadline: optionalText(200, "Keep the subheadline under 200 characters."),
    button_label: optionalText(40, "Keep the button label under 40 characters."),
    link_url: z
      .string()
      .trim()
      .max(2048, "Keep the link under 2048 characters.")
      .refine((v) => v === "" || LINK.test(v), "Use a path in the shop, such as /categories/shoes, or an https:// address."),
    starts_at: z.string(),
    ends_at: z.string(),
    show_countdown: z.boolean(),
    is_active: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    // Both are UAE wall-clock values, so comparing them as local times is enough.
    if (v.starts_at && v.ends_at && new Date(v.ends_at) <= new Date(v.starts_at)) issue("ends_at", "The end must be after the start.");
    if (v.show_countdown && !v.ends_at) issue("show_countdown", "A countdown needs an end date.");
  });

export type BannerValues = z.input<typeof bannerSchema>;
export type BannerOutput = z.output<typeof bannerSchema>;
