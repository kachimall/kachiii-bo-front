import type { Metadata } from "next";
import { PayoutsPage as Payouts } from "./payout-settings";

export const metadata: Metadata = { title: "Payouts" };

export default function PayoutsPage() {
  return <Payouts />;
}
