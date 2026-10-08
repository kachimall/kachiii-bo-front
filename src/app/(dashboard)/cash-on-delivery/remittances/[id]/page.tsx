import type { Metadata } from "next";
import { RemittanceDetail } from "./remittance-detail";

export const metadata: Metadata = { title: "Zajel transfer" };

export default async function RemittancePage({ params }: PageProps<"/cash-on-delivery/remittances/[id]">) {
  const { id } = await params;
  return <RemittanceDetail id={id} />;
}
