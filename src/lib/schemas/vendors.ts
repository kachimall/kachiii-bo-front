import { z } from "zod";

/** UpdateStoreRequest (all optional server-side; the form always sends every field). */
export const storeSchema = z.object({
  name: z.string().trim().min(3, "Use at least 3 characters.").max(120, "Keep the name under 120 characters."),
  slug: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters.")
    .max(60, "Keep the slug under 60 characters.")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, digits and single hyphens."),
  description: z.string().trim().max(2000, "Keep the description under 2000 characters."),
  contact_email: z.union([z.literal(""), z.email("Enter a valid email address.")]),
  contact_phone: z.string().trim().max(30, "Keep the phone number under 30 characters."),
  policies: z.string().trim().max(5000, "Keep the policies under 5000 characters."),
});

/** StoreVendorAgreementRequest */
export const agreementSchema = z.object({
  title: z.string().trim().min(3, "Use at least 3 characters.").max(200, "Keep the title under 200 characters."),
  body: z.string().trim().min(50, "The agreement needs at least 50 characters.").max(100_000, "The agreement is too long."),
});

export type StoreValues = z.infer<typeof storeSchema>;
export type AgreementValues = z.infer<typeof agreementSchema>;
