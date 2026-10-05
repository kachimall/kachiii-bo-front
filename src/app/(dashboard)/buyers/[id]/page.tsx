import type { Metadata } from "next";
import { BuyerDetail } from "./buyer-detail";

export const metadata: Metadata = { title: "Buyer" };

export default async function BuyerPage({ params }: PageProps<"/buyers/[id]">) {
  const { id } = await params;
  return <BuyerDetail id={id} />;
}
