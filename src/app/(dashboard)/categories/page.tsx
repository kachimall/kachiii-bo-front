import type { Metadata } from "next";
import { CategoriesTree } from "./categories-tree";

export const metadata: Metadata = { title: "Categories" };

export default function CategoriesPage() {
  return <CategoriesTree />;
}
