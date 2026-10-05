import type { Metadata } from "next";
import { VoucherDetail } from "./voucher-detail";

export const metadata: Metadata = { title: "Voucher" };

export default async function VoucherPage({ params }: PageProps<"/vouchers/[id]">) {
  const { id } = await params;
  return <VoucherDetail id={id} />;
}
