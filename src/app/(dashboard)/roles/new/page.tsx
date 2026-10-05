"use client";

import { PageHeader } from "@/components/common/page-header";
import { ForbiddenState } from "@/components/common/states";
import { useCan } from "@/store/auth";
import { RoleForm } from "../role-form";

export default function NewRolePage() {
  const can = useCan();
  if (!can("permissions.manage")) return <ForbiddenState />;

  return (
    <>
      <PageHeader back={{ href: "/roles", label: "Roles" }} title="New role" />
      <RoleForm />
    </>
  );
}
