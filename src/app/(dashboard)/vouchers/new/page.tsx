"use client";

import { PageHeader } from "@/components/common/page-header";
import { ForbiddenState } from "@/components/common/states";
import { useCan } from "@/store/auth";
import { VoucherForm } from "../voucher-form";

export default function NewVoucherPage() {
  const can = useCan();
  if (!can("promotions.manage")) return <ForbiddenState />;

  return (
    <>
      <PageHeader back={{ href: "/vouchers", label: "Vouchers" }} title="New voucher" />
      <VoucherForm />
    </>
  );
}
