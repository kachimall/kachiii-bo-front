import type { Metadata } from "next";
import { Suspense } from "react";
import { RefundsList } from "./refunds-list";

export const metadata: Metadata = { title: "Refunds" };

export default function RefundsPage() {
  return (
    <Suspense>
      <RefundsList />
    </Suspense>
  );
}
