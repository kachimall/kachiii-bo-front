import type { Metadata } from "next";
import { CommissionRatesPage } from "./commission-rates";

export const metadata: Metadata = { title: "Commission" };

export default function CommissionPage() {
  return <CommissionRatesPage />;
}
