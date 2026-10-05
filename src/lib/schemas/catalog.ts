import { z } from "zod";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const slug = z
  .string()
  .trim()
  .min(1, "Enter a slug.")
  .max(120, "Keep the slug under 120 characters.")
  .regex(SLUG, "Use lowercase letters, digits and single hyphens, e.g. home-kitchen.");

/** SaveCategoryRequest */
export const categorySchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(100, "Keep the name under 100 characters."),
  slug,
  parent_id: z.string(),
  position: z.coerce.number<string | number>().int().min(0).max(65535),
  is_active: z.boolean(),
});

/** SaveBrandRequest */
export const brandSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(100, "Keep the name under 100 characters."),
  slug,
  is_active: z.boolean(),
});

/** SaveCatalogAttributeRequest */
export const attributeSchema = z.object({
  name: z.string().trim().min(2, "Use at least 2 characters.").max(30, "Keep the name under 30 characters."),
  position: z.coerce.number<string | number>().int().min(0).max(1000),
  is_active: z.boolean(),
});

/** StoreInventoryMovementRequest */
export const movementSchema = z
  .object({
    type: z.enum(["purchase", "adjustment"]),
    quantity: z.coerce.number<string | number>().int("Use a whole number.").min(-1_000_000).max(1_000_000),
    note: z.string().trim().max(500, "Keep the note under 500 characters."),
  })
  .superRefine((value, ctx) => {
    if (value.type === "purchase" && value.quantity < 1) {
      ctx.addIssue({ code: "custom", path: ["quantity"], message: "A purchase adds at least 1 unit." });
    }
    if (value.type === "adjustment" && value.quantity === 0) {
      ctx.addIssue({ code: "custom", path: ["quantity"], message: "An adjustment must change the stock." });
    }
    if (value.type === "adjustment" && value.note === "") {
      ctx.addIssue({ code: "custom", path: ["note"], message: "Say why the stock is adjusted." });
    }
  });

export type CategoryValues = z.input<typeof categorySchema>;
export type BrandValues = z.input<typeof brandSchema>;
export type AttributeValues = z.input<typeof attributeSchema>;
export type MovementValues = z.input<typeof movementSchema>;
export type MovementOutput = z.output<typeof movementSchema>;
export type CategoryOutput = z.output<typeof categorySchema>;
export type BrandOutput = z.output<typeof brandSchema>;
export type AttributeOutput = z.output<typeof attributeSchema>;
