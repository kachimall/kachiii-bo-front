import type { Metadata } from "next";
import { Suspense } from "react";
import { AgreementsList } from "./agreements-list";

export const metadata: Metadata = { title: "Vendor agreements" };

export default function VendorAgreementsPage() {
  return (
    <Suspense>
      <AgreementsList />
    </Suspense>
  );
}
