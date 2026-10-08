"use client";

import Link from "next/link";
import { useState } from "react";
import { ListPanel } from "@/components/common/list-panel";
import { PageHeader } from "@/components/common/page-header";
import { SearchInput } from "@/components/common/search-input";
import { ForbiddenState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { listEmailTemplates } from "@/lib/api/content";
import { formatDateTime, humanize } from "@/lib/format";
import { useCan } from "@/store/auth";

/** Every email the platform sends (DECISIONS CN2), with its current subject; not paginated. */
export function EmailTemplatesList() {
  const can = useCan();
  const allowed = can("content.view");
  const { data, error, loading, reload } = useApi(allowed ? "email-templates" : null, listEmailTemplates);
  const [search, setSearch] = useState("");
  const [recipient, setRecipient] = useState("");

  if (!allowed) return <ForbiddenState />;

  const recipients = [...new Set((data ?? []).map((t) => t.recipient))].sort();
  const term = search.toLowerCase();
  const rows = data?.filter(
    (t) =>
      (!recipient || t.recipient === recipient) &&
      (!term || t.name.toLowerCase().includes(term) || t.subject.toLowerCase().includes(term) || t.key.includes(term)),
  );

  return (
    <>
      <PageHeader
        title="Email templates"
        description="The wording of each email KACHI sends. Changes apply to the next email of that kind; the default can be put back at any time."
      />
      <ListPanel
        rows={rows}
        loading={loading}
        error={error}
        onRetry={reload}
        empty={{ title: "No emails match", description: "Try another search." }}
        filters={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder="Name or subject" />
            <NativeSelect
              aria-label="Recipient"
              className="w-full sm:w-44"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            >
              <option value="">All recipients</option>
              {recipients.map((r) => (
                <option key={r} value={r}>
                  To {r}
                </option>
              ))}
            </NativeSelect>
          </>
        }
      >
        {(list) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Sent to</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Wording</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((template) => (
                <TableRow key={template.key}>
                  <TableCell>
                    <Link href={`/email-templates/${template.key}`} className="font-medium hover:underline">
                      {template.name}
                    </Link>
                  </TableCell>
                  <TableCell>{humanize(template.recipient)}</TableCell>
                  <TableCell className="max-w-96">
                    <span className="block truncate" title={template.subject}>
                      {template.subject}
                    </span>
                  </TableCell>
                  <TableCell>
                    {template.customized ? (
                      <span className="flex flex-col gap-1">
                        <StatusBadge status="customized" label="Changed" tone="info" />
                        <span className="text-xs text-muted-foreground">{formatDateTime(template.updated_at)}</span>
                      </span>
                    ) : (
                      <StatusBadge status="default" label="Default" tone="neutral" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListPanel>
    </>
  );
}
