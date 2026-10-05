"use client";

import Link from "next/link";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ListPanel } from "@/components/common/list-panel";
import { PageHeader } from "@/components/common/page-header";
import { ForbiddenState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { deleteRole, listRoles } from "@/lib/api/staff";
import { humanize } from "@/lib/format";
import { runAction } from "@/lib/forms";
import { useCan } from "@/store/auth";
import { ADMIN_SECTIONS, type StaffRole } from "@/types/api";

export function RolesList() {
  const can = useCan();
  const allowed = can("permissions.manage");
  const { data, error, loading, reload } = useApi(allowed ? "roles" : null, listRoles);
  const [toDelete, setToDelete] = useState<StaffRole | null>(null);

  if (!allowed) return <ForbiddenState />;

  return (
    <>
      <PageHeader
        title="Roles"
        description="What each staff role may view or change. The Super Admin role is fixed and not listed."
        actions={
          <ButtonLink href="/roles/new" variant="default">
            <PlusIcon /> New role
          </ButtonLink>
        }
      />
      <ListPanel rows={data?.data} loading={loading} error={error} onRetry={reload} empty={{ title: "No staff roles yet" }}>
        {(rows) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((role) => {
                const grants = ADMIN_SECTIONS.filter((s) => role.sections[s]);
                return (
                  <TableRow key={role.id}>
                    <TableCell>
                      <Link href={`/roles/${role.id}`} className="font-medium hover:underline">
                        {role.name}
                      </Link>
                      {role.requires_two_factor && <span className="block text-xs text-muted-foreground">2FA required</span>}
                    </TableCell>
                    <TableCell className="max-w-md whitespace-normal">
                      <span className="flex flex-wrap gap-1">
                        {grants.length === 0 && <span className="text-muted-foreground">No access</span>}
                        {grants.map((s) => (
                          <span
                            key={s}
                            className={
                              role.sections[s] === "change"
                                ? "rounded bg-secondary-fixed px-1.5 py-0.5 text-xs text-secondary"
                                : "rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                            }
                          >
                            {humanize(s)}: {role.sections[s]}
                          </span>
                        ))}
                      </span>
                    </TableCell>
                    <TableCell>{role.staff_count ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" onClick={() => setToDelete(role)} aria-label={`Delete ${role.name}`}>
                        <Trash2Icon />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </ListPanel>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete the ${toDelete?.name ?? ""} role?`}
        description="A role that staff still have cannot be deleted: give them another role first."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!toDelete) return false;
          const ok = await runAction(() => deleteRole(toDelete.id), "Role deleted.");
          if (ok) reload();
          return ok;
        }}
      />
    </>
  );
}
