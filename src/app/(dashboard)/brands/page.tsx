import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandsList } from "./brands-list";

export const metadata: Metadata = { title: "Brands" };

export default function BrandsPage() {
  return (
    <Suspense>
      <BrandsList />
    </Suspense>
  );
}
