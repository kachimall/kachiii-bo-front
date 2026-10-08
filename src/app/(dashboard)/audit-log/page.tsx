import type { Metadata } from "next";
import { Suspense } from "react";
import { AuditLogList } from "./audit-log-list";

export const metadata: Metadata = { title: "Audit log" };

export default function AuditLogPage() {
  return (
    <Suspense>
      <AuditLogList />
    </Suspense>
  );
}
