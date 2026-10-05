import type { Metadata } from "next";
import { Suspense } from "react";
import { VendorsList } from "./vendors-list";

export const metadata: Metadata = { title: "Vendors" };

export default function VendorsPage() {
  return (
    <Suspense>
      <VendorsList />
    </Suspense>
  );
}
