"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, ShieldAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Section } from "@/components/common/section";
import { LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/use-api";
import { createRole, listRoles, updateRole } from "@/lib/api/staff";
import { humanize } from "@/lib/format";
import { handleFormError } from "@/lib/forms";
import { roleSchema, type RoleValues } from "@/lib/schemas/staff";
import { cn } from "@/lib/utils";
import { ADMIN_SECTIONS, type SectionGrants, type SectionInfo, type StaffRole } from "@/types/api";

const LEVEL_LABELS = { none: "No access", view: "View", change: "Change" } as const;

function toForm(role?: StaffRole): RoleValues {
  const sections = Object.fromEntries(ADMIN_SECTIONS.map((s) => [s, role?.sections[s] ?? "none"])) as RoleValues["sections"];
  return { name: role?.name ?? "", sections };
}

function toGrants(sections: RoleValues["sections"]): SectionGrants {
  return Object.fromEntries(ADMIN_SECTIONS.map((s) => [s, sections[s] === "none" ? null : sections[s]])) as SectionGrants;
}

export function RoleForm({ role, onSaved }: { role?: StaffRole; onSaved?: (role: StaffRole) => void }) {
  // meta.sections says which levels each section offers (reports is view-only).
  const { data } = useApi("roles:sections", listRoles);
  const sections: SectionInfo[] =
    data?.meta.sections ?? ADMIN_SECTIONS.map((key) => ({ key, name: humanize(key), levels: key === "reports" ? ["view"] : ["view", "change"] }));

  if (!data) return <LoadingState />;
  return <RoleFormInner role={role} sections={sections} onSaved={onSaved} />;
}

function RoleFormInner({ role, sections, onSaved }: { role?: StaffRole; sections: SectionInfo[]; onSaved?: (role: StaffRole) => void }) {
  const router = useRouter();
  const form = useForm<RoleValues>({ resolver: zodResolver(roleSchema), defaultValues: toForm(role) });
  const { errors, isSubmitting } = form.formState;
  const finance = useWatch({ control: form.control, name: "sections.finance" });

  const submit = form.handleSubmit(async (values) => {
    const body = { name: values.name, sections: toGrants(values.sections) };
    try {
      if (role) {
        const saved = await updateRole(role.id, body);
        form.reset(toForm(saved));
        onSaved?.(saved);
        toast.success("Role saved. Its staff have the new access now.");
      } else {
        const saved = await createRole(body);
        toast.success("Role created.");
        router.replace(`/roles/${saved.id}`);
      }
    } catch (error) {
      handleFormError(error, form.setError, ["name", "sections"]);
    }
  });

  return (
    <form onSubmit={submit} className="grid gap-6" noValidate>
      <Section title="Role">
        <Field label="Name" htmlFor="r-name" error={errors.name?.message} className="max-w-sm">
          <Input id="r-name" maxLength={50} aria-invalid={Boolean(errors.name)} {...form.register("name")} />
        </Field>
      </Section>

      <Section title="Access by section" flush>
        <div className="divide-y">
          {sections.map((section) => (
            <Controller
              key={section.key}
              control={form.control}
              name={`sections.${section.key}`}
              render={({ field }) => (
                <div className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium" id={`sec-${section.key}`}>
                    {section.name}
                  </span>
                  <div role="radiogroup" aria-labelledby={`sec-${section.key}`} className="inline-flex rounded-lg bg-muted p-0.5">
                    {(["none", ...section.levels] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        role="radio"
                        aria-checked={field.value === level}
                        onClick={() => field.onChange(level)}
                        className={cn(
                          "rounded-md px-3 py-1 text-sm transition-colors",
                          field.value === level ? "bg-card font-medium shadow-sm ring-1 ring-foreground/10" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {LEVEL_LABELS[level]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            />
          ))}
        </div>
        {errors.sections && <p className="px-5 pb-4 text-xs text-destructive">{errors.sections.message ?? "Check the section access."}</p>}
      </Section>

      {finance !== "none" && (
        <p className="flex items-center gap-2 rounded-lg bg-tertiary-fixed px-4 py-3 text-sm text-on-tertiary-fixed">
          <ShieldAlertIcon className="size-4 shrink-0" />
          Access to finance makes two-factor authentication mandatory for this role&apos;s staff.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <ButtonLink href="/roles">Cancel</ButtonLink>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2Icon className="animate-spin" />}
          {role ? "Save role" : "Create role"}
        </Button>
      </div>
    </form>
  );
}
