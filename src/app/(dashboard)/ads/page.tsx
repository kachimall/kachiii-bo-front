import type { Metadata } from "next";
import { Suspense } from "react";
import { AdsView } from "./ads-view";

export const metadata: Metadata = { title: "Ads" };

export default function AdsPage() {
  return (
    <Suspense>
      <AdsView />
    </Suspense>
  );
}
