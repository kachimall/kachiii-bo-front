import type { Metadata } from "next";
import { EmailTemplateEditor } from "./email-template-editor";

export const metadata: Metadata = { title: "Email template" };

export default async function EmailTemplatePage({ params }: PageProps<"/email-templates/[key]">) {
  const { key } = await params;
  return <EmailTemplateEditor templateKey={key} />;
}
