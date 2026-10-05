import type { Metadata } from "next";
import { Suspense } from "react";
import { StoresList } from "./stores-list";

export const metadata: Metadata = { title: "Stores" };

export default function StoresPage() {
  return (
    <Suspense>
      <StoresList />
    </Suspense>
  );
}
