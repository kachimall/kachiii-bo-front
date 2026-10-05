"use client";

import { PageHeader } from "@/components/common/page-header";
import { AsyncContent, ForbiddenState } from "@/components/common/states";
import { useApi } from "@/hooks/use-api";
import { getRole } from "@/lib/api/staff";
import { useCan } from "@/store/auth";
import { RoleForm } from "../role-form";

export function RoleDetail({ id }: { id: string }) {
  const can = useCan();
  const allowed = can("permissions.manage");
  const { data, error, loading, reload, mutate } = useApi(allowed ? `role:${id}` : null, () => getRole(id));

  if (!allowed) return <ForbiddenState />;

  return (
    <AsyncContent data={data} error={error} loading={loading} onRetry={reload}>
      {(role) => (
        <>
          <PageHeader
            back={{ href: "/roles", label: "Roles" }}
            title={role.name}
            description={`${role.staff_count ?? 0} staff member${role.staff_count === 1 ? "" : "s"} with this role`}
          />
          <RoleForm key={role.updated_at ?? role.id} role={role} onSaved={mutate} />
        </>
      )}
    </AsyncContent>
  );
}
