import type { Metadata } from "next";
import { PagesList } from "./pages-list";

export const metadata: Metadata = { title: "Pages" };

export default function PagesPage() {
  return <PagesList />;
}
