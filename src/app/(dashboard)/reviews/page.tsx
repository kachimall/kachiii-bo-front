import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewsList } from "./reviews-list";

export const metadata: Metadata = { title: "Reviews" };

export default function ReviewsPage() {
  return (
    <Suspense>
      <ReviewsList />
    </Suspense>
  );
}
