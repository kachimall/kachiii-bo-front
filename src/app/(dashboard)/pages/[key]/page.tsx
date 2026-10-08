import type { Metadata } from "next";
import { PageEditor } from "./page-editor";

export const metadata: Metadata = { title: "Page" };

export default async function StaticPagePage({ params }: PageProps<"/pages/[key]">) {
  const { key } = await params;
  return <PageEditor pageKey={key} />;
}
