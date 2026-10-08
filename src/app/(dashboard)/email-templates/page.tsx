import type { Metadata } from "next";
import { EmailTemplatesList } from "./email-templates-list";

export const metadata: Metadata = { title: "Email templates" };

export default function EmailTemplatesPage() {
  return <EmailTemplatesList />;
}
