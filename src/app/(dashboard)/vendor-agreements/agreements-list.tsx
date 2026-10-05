"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ListPanel } from "@/components/common/list-panel";
import { PageHeader } from "@/components/common/page-header";
import { ForbiddenState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { useQueryState } from "@/hooks/use-query-state";
import { listAgreements, publishAgreement } from "@/lib/api/vendors";
import { formatDateTime } from "@/lib/format";
import { handleFormError } from "@/lib/forms";
import { agreementSchema, type AgreementValues } from "@/lib/schemas/vendors";
import { useCan } from "@/store/auth";
import type { VendorAgreement } from "@/types/api";

export function AgreementsList() {
  const can = useCan();
  const allowed = can("content.view");
  const query = useQueryState();
  const { data, error, loading, reload } = useApi(allowed ? `agreements?${query.key}` : null, () =>
    listAgreements({ page: query.page }),
  );
  const [viewing, setViewing] = useState<VendorAgreement | null>(null);
  const [publishing, setPublishing] = useState(false);

  if (!allowed) return <ForbiddenState />;

  return (
    <>
      <PageHeader
        title="Vendor agreements"
        description="Each version vendors accept when approved. Publishing a new version does not change past acceptances."
        actions={
          can("content.manage") && (
            <Button onClick={() => setPublishing(true)}>
              <PlusIcon /> Publish new version
            </Button>
          )
        }
      />
      <ListPanel
        rows={data?.data}
        meta={data?.meta}
        loading={loading}
        error={error}
        onRetry={reload}
        onPage={(page) => query.set({ page })}
        empty={{ title: "No agreement published yet" }}
      >
        {(rows) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Published</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((agreement) => (
                <TableRow key={agreement.id}>
                  <TableCell className="font-medium">v{agreement.version}</TableCell>
                  <TableCell>{agreement.title}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(agreement.published_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setViewing(agreement)}>
                      Read
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListPanel>

      <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {viewing?.title} (v{viewing?.version})
            </DialogTitle>
            <DialogDescription>Published {formatDateTime(viewing?.published_at)}</DialogDescription>
          </DialogHeader>
          <div className="text-sm whitespace-pre-wrap">{viewing?.body}</div>
        </DialogContent>
      </Dialog>

      <Dialog open={publishing} onOpenChange={setPublishing}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          {publishing && (
            <PublishForm
              onDone={() => {
                setPublishing(false);
                query.set({ page: null });
                reload();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PublishForm({ onDone }: { onDone: () => void }) {
  const form = useForm<AgreementValues>({ resolver: zodResolver(agreementSchema), defaultValues: { title: "", body: "" } });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    try {
      await publishAgreement(values);
      toast.success("New agreement version published.");
      onDone();
    } catch (error) {
      handleFormError(error, form.setError, ["title", "body"]);
    }
  });

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>Publish a new agreement version</DialogTitle>
        <DialogDescription>Vendors approved from now on accept this version. It cannot be edited after publishing.</DialogDescription>
      </DialogHeader>
      <Field label="Title" htmlFor="ag-title" error={errors.title?.message}>
        <Input id="ag-title" maxLength={200} aria-invalid={Boolean(errors.title)} {...form.register("title")} />
      </Field>
      <Field label="Agreement text" htmlFor="ag-body" error={errors.body?.message}>
        <Textarea id="ag-body" rows={14} aria-invalid={Boolean(errors.body)} {...form.register("body")} />
      </Field>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2Icon className="animate-spin" />}
          Publish
        </Button>
      </DialogFooter>
    </form>
  );
}
