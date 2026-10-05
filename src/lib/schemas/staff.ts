import { z } from "zod";
import { ADMIN_SECTIONS } from "@/types/api";

/** SaveStaffRequest (create). On update the email is prohibited. */
export const staffSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(255, "Keep the name under 255 characters."),
  email: z.email("Enter a valid email address.").max(255),
  role: z.string().min(1, "Choose a role."),
});

const level = z.enum(["none", "view", "change"]);

/** SaveStaffRoleRequest; "none" in the form becomes null in the request. */
export const roleSchema = z.object({
  name: z.string().trim().min(2, "Use at least 2 characters.").max(50, "Keep the name under 50 characters."),
  sections: z.object(Object.fromEntries(ADMIN_SECTIONS.map((section) => [section, level])) as Record<(typeof ADMIN_SECTIONS)[number], typeof level>),
});

export type StaffValues = z.infer<typeof staffSchema>;
export type RoleValues = z.infer<typeof roleSchema>;
