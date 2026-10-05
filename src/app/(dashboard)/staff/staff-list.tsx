"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, PlusIcon, ShieldCheckIcon, ShieldOffIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FilterSelect, ListPanel } from "@/components/common/list-panel";
import { PageHeader } from "@/components/common/page-header";
import { SearchInput } from "@/components/common/search-input";
import { ForbiddenState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { useQueryState } from "@/hooks/use-query-state";
import { createStaff, listRoles, listStaff } from "@/lib/api/staff";
import { formatDate } from "@/lib/format";
import { handleFormError } from "@/lib/forms";
import { staffSchema, type StaffValues } from "@/lib/schemas/staff";
import { useCan } from "@/store/auth";
import type { StaffRole } from "@/types/api";

/** Staff roles for pickers; needs permissions.manage (the Super Admin's). */
export function useRoles(enabled: boolean): StaffRole[] {
  const { data } = useApi(enabled ? "roles" : null, listRoles);
  return data?.data ?? [];
}

export function StaffList() {
  const can = useCan();
  const allowed = can("admins.manage");
  const query = useQueryState();
  const q = query.get("q");
  const status = query.get("status");
  const role = query.get("role");
  const { data, error, loading, reload } = useApi(allowed ? `staff?${query.key}` : null, () =>
    listStaff({ q, status, role, page: query.page }),
  );
  const roles = useRoles(allowed && can("permissions.manage"));
  const [creating, setCreating] = useState(false);

  if (!allowed) return <ForbiddenState />;

  return (
    <>
      <PageHeader
        title="Staff"
        description="Back-office accounts. New staff get an email to set their password."
        actions={
          <Button onClick={() => setCreating(true)}>
            <PlusIcon /> Add staff
          </Button>
        }
      />
      <ListPanel
        rows={data?.data}
        meta={data?.meta}
        loading={loading}
        error={error}
        onRetry={reload}
        onPage={(page) => query.set({ page })}
        empty={{ title: "No staff found" }}
        filters={
          <>
            <SearchInput value={q} onChange={(value) => query.set({ q: value })} placeholder="Name or email" />
            <FilterSelect label="Statuses" value={status} onChange={(value) => query.set({ status: value })} options={["active", "suspended", "inactive"]} />
            {roles.length > 0 && (
              <FilterSelect
                label="Roles"
                value={role}
                onChange={(value) => query.set({ role: value })}
                options={roles.map((r) => ({ value: r.id, label: r.name }))}
              />
            )}
          </>
        }
      >
        {(rows) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>2FA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((staff) => (
                <TableRow key={staff.id}>
                  <TableCell>
                    <Link href={`/staff/${staff.id}`} className="font-medium hover:underline">
                      {staff.name}
                    </Link>
                    <span className="block text-xs text-muted-foreground">{staff.email}</span>
                  </TableCell>
                  <TableCell>{staff.role?.name ?? "—"}</TableCell>
                  <TableCell>
                    {staff.two_factor?.enabled ? (
                      <span className="inline-flex items-center gap-1 text-success">
                        <ShieldCheckIcon className="size-4" /> On
                      </span>
                    ) : (
                      <span className={staff.two_factor?.required ? "inline-flex items-center gap-1 text-destructive" : "inline-flex items-center gap-1 text-muted-foreground"}>
                        <ShieldOffIcon className="size-4" /> {staff.two_factor?.required ? "Required, off" : "Off"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={staff.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(staff.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListPanel>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">{creating && <CreateStaffForm roles={roles} />}</DialogContent>
      </Dialog>
    </>
  );
}

function CreateStaffForm({ roles }: { roles: StaffRole[] }) {
  const router = useRouter();
  const form = useForm<StaffValues>({ resolver: zodResolver(staffSchema), defaultValues: { name: "", email: "", role: "" } });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    try {
      const staff = await createStaff(values);
      toast.success(`Staff account created. ${staff.email} was sent a link to set a password.`);
      router.push(`/staff/${staff.id}`);
    } catch (error) {
      handleFormError(error, form.setError, ["name", "email", "role"]);
    }
  });

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>Add staff</DialogTitle>
        <DialogDescription>They receive an email with a link to set their password.</DialogDescription>
      </DialogHeader>
      <Field label="Name" htmlFor="st-name" error={errors.name?.message}>
        <Input id="st-name" maxLength={255} aria-invalid={Boolean(errors.name)} {...form.register("name")} />
      </Field>
      <Field label="Email" htmlFor="st-email" error={errors.email?.message} hint="It cannot be changed later.">
        <Input id="st-email" type="email" maxLength={255} aria-invalid={Boolean(errors.email)} {...form.register("email")} />
      </Field>
      <Field label="Role" htmlFor="st-role" error={errors.role?.message}>
        <NativeSelect id="st-role" aria-invalid={Boolean(errors.role)} {...form.register("role")}>
          <option value="">Choose a role</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
              {role.requires_two_factor ? " (2FA required)" : ""}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2Icon className="animate-spin" />}
          Create account
        </Button>
      </DialogFooter>
    </form>
  );
}
