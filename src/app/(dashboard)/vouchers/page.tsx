import type { Metadata } from "next";
import { Suspense } from "react";
import { VouchersList } from "./vouchers-list";

export const metadata: Metadata = { title: "Vouchers" };

export default function VouchersPage() {
  return (
    <Suspense>
      <VouchersList />
    </Suspense>
  );
}
