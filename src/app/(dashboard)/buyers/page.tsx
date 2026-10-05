import type { Metadata } from "next";
import { Suspense } from "react";
import { BuyersList } from "./buyers-list";

export const metadata: Metadata = { title: "Buyers" };

export default function BuyersPage() {
  return (
    <Suspense>
      <BuyersList />
    </Suspense>
  );
}
