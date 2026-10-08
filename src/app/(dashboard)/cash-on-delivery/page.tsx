import type { Metadata } from "next";
import { Suspense } from "react";
import { CodView } from "./cod-view";

export const metadata: Metadata = { title: "Cash on delivery" };

export default function CashOnDeliveryPage() {
  return (
    <Suspense>
      <CodView />
    </Suspense>
  );
}
