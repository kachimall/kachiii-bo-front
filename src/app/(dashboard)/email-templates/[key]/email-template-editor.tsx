"use client";

import { EyeIcon, Loader2Icon, RotateCcwIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/common/page-header";
import { Section } from "@/components/common/section";
import { AsyncContent, ForbiddenState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { ApiError, errorMessage } from "@/lib/api/client";
import { getEmailTemplate, previewEmailTemplate, resetEmailTemplate, saveEmailTemplate } from "@/lib/api/content";
import { formatDateTime } from "@/lib/format";
import { useCan } from "@/store/auth";
import type { EmailPreview, EmailTemplate } from "@/types/api";

export function EmailTemplateEditor({ templateKey }: { templateKey: string }) {
  const can = useCan();
  const allowed = can("content.view");
  const { data, error, loading, reload, mutate } = useApi(allowed ? `email-template:${templateKey}` : null, () =>
    getEmailTemplate(templateKey),
  );

  if (!allowed) return <ForbiddenState />;

  return (
    <AsyncContent data={data} error={error} loading={loading} onRetry={reload}>
      {(template) => (
        <Editor key={template.updated_at ?? "default"} template={template} readOnly={!can("content.manage")} onSaved={mutate} />
      )}
    </AsyncContent>
  );
}

type Errors = { subject?: string; body?: string };

function Editor({ template, readOnly, onSaved }: { template: EmailTemplate; readOnly: boolean; onSaved: (t: EmailTemplate) => void }) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [preview, setPreview] = useState<EmailPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const lastFocused = useRef<"subject" | "body">("body");

  const dirty = subject !== template.subject || body !== template.body;
  const isDefault = subject === template.default.subject && body === template.default.body;

  function fieldErrors(error: unknown): boolean {
    if (error instanceof ApiError && error.status === 422) {
      setErrors({ subject: error.firstError("subject"), body: error.firstError("body") });
      if (!error.firstError("subject") && !error.firstError("body")) toast.error(errorMessage(error));
      return true;
    }
    toast.error(errorMessage(error));
    return false;
  }

  async function save() {
    setSaving(true);
    setErrors({});
    try {
      const saved = await saveEmailTemplate(template.key, { subject, body });
      onSaved(saved);
      toast.success("Email saved. The next one of this kind uses it.");
    } catch (error) {
      fieldErrors(error);
    } finally {
      setSaving(false);
    }
  }

  async function showPreview() {
    setPreviewing(true);
    setErrors({});
    try {
      setPreview(await previewEmailTemplate(template.key, { subject, body }));
    } catch (error) {
      fieldErrors(error);
    } finally {
      setPreviewing(false);
    }
  }

  /** Puts {name} at the cursor of the field last used. */
  function insert(name: string) {
    const token = `{${name}}`;
    const target = lastFocused.current === "subject" ? subjectRef.current : bodyRef.current;
    const value = lastFocused.current === "subject" ? subject : body;
    const start = target?.selectionStart ?? value.length;
    const end = target?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    if (lastFocused.current === "subject") setSubject(next);
    else setBody(next);
    requestAnimationFrame(() => {
      target?.focus();
      target?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  return (
    <>
      <PageHeader
        back={{ href: "/email-templates", label: "Email templates" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {template.name}
            {template.customized ? <StatusBadge status="customized" label="Changed" tone="info" /> : <StatusBadge status="default" label="Default" />}
          </span>
        }
        description={`Sent to the ${template.recipient}.${template.customized ? ` Last changed ${formatDateTime(template.updated_at)}.` : ""}`}
        actions={
          !readOnly &&
          template.customized && (
            <Button variant="outline" onClick={() => setResetting(true)}>
              <RotateCcwIcon /> Put the default back
            </Button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid h-fit gap-6">
          <Section title="Wording">
            <fieldset disabled={readOnly || saving} className="grid gap-4">
              <Field label="Subject" htmlFor="et-subject" error={errors.subject} hint={`${subject.length}/200`}>
                <Input
                  id="et-subject"
                  ref={subjectRef}
                  value={subject}
                  maxLength={200}
                  aria-invalid={Boolean(errors.subject)}
                  onFocus={() => (lastFocused.current = "subject")}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </Field>
              <Field
                label="Body"
                htmlFor="et-body"
                error={errors.body}
                hint={
                  <>
                    Plain text: each line becomes a paragraph, and a line left empty by its placeholders is dropped.
                    {template.button &&
                      ` The "${template.button}" button goes where {button} stands on a line of its own, or after all the text.`}{" "}
                    {body.length}/5000
                  </>
                }
              >
                <Textarea
                  id="et-body"
                  ref={bodyRef}
                  value={body}
                  rows={14}
                  maxLength={5000}
                  className="font-mono text-sm"
                  aria-invalid={Boolean(errors.body)}
                  onFocus={() => (lastFocused.current = "body")}
                  onChange={(e) => setBody(e.target.value)}
                />
              </Field>
            </fieldset>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {!readOnly && !isDefault && (
                <Button
                  variant="ghost"
                  disabled={saving}
                  onClick={() => {
                    setSubject(template.default.subject);
                    setBody(template.default.body);
                    setErrors({});
                  }}
                >
                  Use the default wording
                </Button>
              )}
              {!readOnly && dirty && (
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => {
                    setSubject(template.subject);
                    setBody(template.body);
                    setErrors({});
                  }}
                >
                  Discard changes
                </Button>
              )}
              <Button variant="outline" onClick={showPreview} disabled={previewing}>
                {previewing ? <Loader2Icon className="animate-spin" /> : <EyeIcon />}
                Preview
              </Button>
              {!readOnly && (
                <Button onClick={save} disabled={!dirty || saving}>
                  {saving && <Loader2Icon className="animate-spin" />}
                  Save
                </Button>
              )}
            </div>
            {readOnly && (
              <p className="mt-4 text-sm text-muted-foreground">You can view and preview this email; changing it needs the content.manage permission.</p>
            )}
          </Section>

          {preview && (
            <Section title="Preview" actions={<span className="text-xs text-muted-foreground">With sample values</span>}>
              <p className="mb-3 text-sm">
                <span className="text-muted-foreground">Subject: </span>
                <span className="font-medium">{preview.subject}</span>
              </p>
              {/* Sandboxed: no scripts, and links cannot navigate this page. */}
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={preview.html}
                className="h-[640px] w-full rounded-lg bg-white ring-1 ring-foreground/10"
              />
            </Section>
          )}
        </div>

        <Section title="Placeholders" className="h-fit">
          {template.placeholders.length === 0 ? (
            <p className="text-sm text-muted-foreground">This email has no placeholders.</p>
          ) : (
            <ul className="grid gap-3">
              {template.placeholders.map((placeholder) => (
                <li key={placeholder.name} className="grid gap-0.5">
                  <button
                    type="button"
                    disabled={readOnly}
                    className="w-fit rounded bg-muted px-1.5 py-0.5 font-mono text-xs hover:bg-muted/70 disabled:cursor-default"
                    title={readOnly ? undefined : "Insert at the cursor"}
                    onClick={() => insert(placeholder.name)}
                  >
                    {`{${placeholder.name}}`}
                  </button>
                  <span className="text-xs text-muted-foreground">{placeholder.description}</span>
                  <span className="text-xs text-muted-foreground">e.g. {placeholder.sample}</span>
                </li>
              ))}
            </ul>
          )}
          {template.button && (
            <p className="mt-4 text-xs text-muted-foreground">
              <span className="font-mono">{"{button}"}</span>: the &ldquo;{template.button}&rdquo; button, which is not editable.
            </p>
          )}
        </Section>
      </div>

      <ConfirmDialog
        open={resetting}
        onOpenChange={setResetting}
        title="Put the default wording back?"
        description="The saved wording is replaced by the default; the next email of this kind uses it."
        confirmLabel="Put the default back"
        destructive
        onConfirm={async () => {
          try {
            onSaved(await resetEmailTemplate(template.key));
            toast.success("Default wording put back.");
            return true;
          } catch (error) {
            toast.error(errorMessage(error));
            return false;
          }
        }}
      />
    </>
  );
}
