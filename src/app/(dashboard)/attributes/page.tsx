import type { Metadata } from "next";
import { AttributesList } from "./attributes-list";

export const metadata: Metadata = { title: "Attributes" };

export default function AttributesPage() {
  return <AttributesList />;
}
