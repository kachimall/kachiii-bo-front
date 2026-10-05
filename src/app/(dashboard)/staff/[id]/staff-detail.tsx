"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DetailList } from "@/components/common/detail-list";
import { PageHeader } from "@/components/common/page-header";
import { Section } from "@/components/common/section";
import { AsyncContent, ForbiddenState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useApi } from "@/hooks/use-api";
import { getStaff, resetStaffTwoFactor, sendStaffPasswordReset, setStaffStatus, updateStaff } from "@/lib/api/staff";
import { formatDateTime } from "@/lib/format";
import { handleFormError, runAction } from "@/lib/forms";
import { staffSchema } from "@/lib/schemas/staff";
import { useAuth, useCan } from "@/store/auth";
import type { Staff, StaffRole } from "@/types/api";
import { useRoles } from "../staff-list";

const editSchema = staffSchema.pick({ name: true, role: true });
type EditValues = z.infer<typeof editSchema>;

export function StaffDetail({ id }: { id: string }) {
  const can = useCan();
  const allowed = can("admins.manage");
  const { data, error, loading, reload, mutate } = useApi(allowed ? `staff:${id}` : null, () => getStaff(id));
  const roles = useRoles(allowed && can("permissions.manage"));

  if (!allowed) return <ForbiddenState />;

  return (
    <AsyncContent data={data} error={error} loading={loading} onRetry={reload}>
      {(staff) => <StaffView staff={staff} roles={roles} onChange={mutate} />}
    </AsyncContent>
  );
}

type Confirm = "status" | "password" | "two-factor" | null;

function StaffView({ staff, roles, onChange }: { staff: Staff; roles: StaffRole[]; onChange: (s: Staff) => void }) {
  const me = useAuth((s) => s.user);
  const isSelf = me?.id === staff.id;
  const [confirm, setConfirm] = useState<Confirm>(null);
  const suspended = staff.status === "suspended";

  return (
    <>
      <PageHeader
        back={{ href: "/staff", label: "Staff" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {staff.name} <StatusBadge status={staff.status} />
          </span>
        }
        description={`${staff.email}${staff.role ? ` · ${staff.role.name}` : ""}`}
        actions={
          !isSelf && (
            <>
              <Button variant="outline" onClick={() => setConfirm("password")}>
                Send password reset
              </Button>
              {staff.two_factor?.enabled && (
                <Button variant="outline" onClick={() => setConfirm("two-factor")}>
                  Reset 2FA
                </Button>
              )}
              <Button variant={suspended ? "default" : "destructive"} onClick={() => setConfirm("status")}>
                {suspended ? "Reactivate" : "Suspend"}
              </Button>
            </>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EditForm staff={staff} roles={roles} onSaved={onChange} />
        </div>
        <Section title="Security" className="h-fit">
          <DetailList
            className="sm:grid-cols-1"
            items={[
              {
                label: "Two-factor authentication",
                value: staff.two_factor?.enabled ? "On" : staff.two_factor?.required ? "Required, not set up yet" : "Off",
              },
              { label: "2FA required by role", value: staff.two_factor?.required ? "Yes" : "No" },
              { label: "Added", value: formatDateTime(staff.created_at) },
            ]}
          />
        </Section>
      </div>

      <ConfirmDialog
        open={confirm === "status"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={suspended ? `Reactivate ${staff.name}?` : `Suspend ${staff.name}?`}
        description={suspended ? "They can sign in to the admin again." : "They are signed out everywhere and cannot sign in until reactivated."}
        confirmLabel={suspended ? "Reactivate" : "Suspend"}
        destructive={!suspended}
        onConfirm={() =>
          runAction(async () => {
            // The status answer leaves out the role and 2FA, so keep ours.
            const updated = await setStaffStatus(staff.id, suspended ? "active" : "suspended");
            onChange({ ...staff, status: updated.status });
          }, suspended ? "Staff account reactivated." : "Staff account suspended.")
        }
      />
      <ConfirmDialog
        open={confirm === "password"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Send a password reset link?"
        description={`An email with a link to choose a new password goes to ${staff.email}.`}
        confirmLabel="Send link"
        onConfirm={() => runAction(() => sendStaffPasswordReset(staff.id), "Password reset link sent.")}
      />
      <ConfirmDialog
        open={confirm === "two-factor"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Reset ${staff.name}'s two-factor authentication?`}
        description="Use this when they lost their phone and recovery codes. They set 2FA up again at their next sign-in."
        confirmLabel="Reset 2FA"
        destructive
        onConfirm={() => runAction(async () => onChange(await resetStaffTwoFactor(staff.id)), "Two-factor authentication was reset.")}
      />
    </>
  );
}

function EditForm({ staff, roles, onSaved }: { staff: Staff; roles: StaffRole[]; onSaved: (s: Staff) => void }) {
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    values: { name: staff.name, role: staff.role?.id ?? "" },
  });
  const { errors, isSubmitting, isDirty } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    try {
      onSaved(await updateStaff(staff.id, values));
      toast.success("Staff account saved.");
    } catch (error) {
      handleFormError(error, form.setError, ["name", "role"]);
    }
  });

  return (
    <Section title="Details">
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="sd-name" error={errors.name?.message}>
            <Input id="sd-name" maxLength={255} aria-invalid={Boolean(errors.name)} {...form.register("name")} />
          </Field>
          <Field label="Email" htmlFor="sd-email" hint="The email cannot be changed.">
            <Input id="sd-email" value={staff.email} disabled readOnly />
          </Field>
        </div>
        <Field label="Role" htmlFor="sd-role" error={errors.role?.message} hint="The new role's access applies at once.">
          <NativeSelect id="sd-role" aria-invalid={Boolean(errors.role)} {...form.register("role")}>
            {!staff.role && <option value="">No role</option>}
            {staff.role && !roles.some((r) => r.id === staff.role?.id) && <option value={staff.role.id}>{staff.role.name}</option>}
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
                {role.requires_two_factor ? " (2FA required)" : ""}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting && <Loader2Icon className="animate-spin" />}
            Save
          </Button>
        </div>
      </form>
    </Section>
  );
}
