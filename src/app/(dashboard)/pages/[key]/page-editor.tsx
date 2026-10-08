"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { Section } from "@/components/common/section";
import { AsyncContent, ForbiddenState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { ApiError, errorMessage } from "@/lib/api/client";
import { getPage, savePage } from "@/lib/api/content";
import { formatDateTime } from "@/lib/format";
import { useCan } from "@/store/auth";
import type { StaticPage } from "@/types/api";

export function PageEditor({ pageKey }: { pageKey: string }) {
  const can = useCan();
  const allowed = can("content.view");
  const { data, error, loading, reload, mutate } = useApi(allowed ? `page:${pageKey}` : null, () => getPage(pageKey));

  if (!allowed) return <ForbiddenState />;

  return (
    <AsyncContent data={data} error={error} loading={loading} onRetry={reload}>
      {(page) => <Editor key={page.updated_at ?? page.key} page={page} readOnly={!can("content.manage")} onSaved={mutate} />}
    </AsyncContent>
  );
}

type Errors = { title?: string; body?: string; is_published?: string };

function Editor({ page, readOnly, onSaved }: { page: StaticPage; readOnly: boolean; onSaved: (page: StaticPage) => void }) {
  const [title, setTitle] = useState(page.title);
  const [body, setBody] = useState(page.body);
  const [published, setPublished] = useState(page.is_published);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const dirty = title !== page.title || body !== page.body || published !== page.is_published;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const next: Errors = {};
    if (title.trim().length < 3) next.title = "Give the page a title of at least 3 characters.";
    if (body.trim() === "") next.body = "Write the page's text.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      onSaved(await savePage(page.key, { title: title.trim(), body, is_published: published }));
      toast.success("Page saved. The shop shows it within five minutes.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        setErrors({ title: error.firstError("title"), body: error.firstError("body"), is_published: error.firstError("is_published") });
      } else {
        toast.error(errorMessage(error));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        back={{ href: "/pages", label: "Pages" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {page.title}
            <StatusBadge status={page.is_published ? "live" : "off"} label={page.is_published ? "Shown" : "Hidden"} />
          </span>
        }
        description={`At /${page.key} in the shop. Last updated ${formatDateTime(page.updated_at)}.`}
      />
      <form onSubmit={save} noValidate>
        <Section title="Content">
          <fieldset disabled={readOnly || saving} className="grid gap-4">
            <Field label="Title" htmlFor="pg-title" error={errors.title} hint="3 to 120 characters.">
              <Input id="pg-title" value={title} maxLength={120} aria-invalid={Boolean(errors.title)} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field
              label="Text"
              htmlFor="pg-body"
              error={errors.body}
              hint={`Markdown: # for headings, **bold**, - for lists, [text](https://…) for links. ${body.length.toLocaleString("en")}/50,000`}
            >
              <Textarea
                id="pg-body"
                value={body}
                rows={24}
                maxLength={50000}
                className="font-mono text-sm"
                aria-invalid={Boolean(errors.body)}
                onChange={(e) => setBody(e.target.value)}
              />
            </Field>
            <div className="grid gap-1.5">
              <Label className="font-normal">
                <Switch checked={published} onCheckedChange={setPublished} disabled={readOnly} />
                Show this page in the shop
              </Label>
              {errors.is_published && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.is_published}
                </p>
              )}
            </div>
          </fieldset>
          {readOnly ? (
            <p className="mt-4 text-sm text-muted-foreground">You can view this page; changing it needs the content.manage permission.</p>
          ) : (
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!dirty || saving}
                onClick={() => {
                  setTitle(page.title);
                  setBody(page.body);
                  setPublished(page.is_published);
                  setErrors({});
                }}
              >
                Discard changes
              </Button>
              <Button type="submit" disabled={!dirty || saving}>
                {saving && <Loader2Icon className="animate-spin" />}
                Save page
              </Button>
            </div>
          )}
        </Section>
      </form>
    </>
  );
}
