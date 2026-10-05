import type { Metadata } from "next";
import { Suspense } from "react";
import { StaffList } from "./staff-list";

export const metadata: Metadata = { title: "Staff" };

export default function StaffPage() {
  return (
    <Suspense>
      <StaffList />
    </Suspense>
  );
}
