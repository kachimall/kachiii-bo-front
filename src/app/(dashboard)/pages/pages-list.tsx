"use client";

import Link from "next/link";
import { ListPanel } from "@/components/common/list-panel";
import { PageHeader } from "@/components/common/page-header";
import { ForbiddenState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { listPages } from "@/lib/api/content";
import { formatDateTime } from "@/lib/format";
import { useCan } from "@/store/auth";

/** The shop's static pages (DECISIONS CN3): terms, privacy, returns policy and contact. */
export function PagesList() {
  const can = useCan();
  const allowed = can("content.view");
  const { data, error, loading, reload } = useApi(allowed ? "pages" : null, listPages);

  if (!allowed) return <ForbiddenState />;

  return (
    <>
      <PageHeader
        title="Pages"
        description="The shop's terms, privacy, returns policy and contact pages. A change reaches the shop within five minutes."
      />
      <ListPanel rows={data} loading={loading} error={error} onRetry={reload} empty={{ title: "No pages" }}>
        {(rows) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>In the shop</TableHead>
                <TableHead>Last updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((page) => (
                <TableRow key={page.key}>
                  <TableCell>
                    <Link href={`/pages/${page.key}`} className="font-medium hover:underline">
                      {page.title}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">/{page.key}</TableCell>
                  <TableCell>
                    <StatusBadge status={page.is_published ? "live" : "off"} label={page.is_published ? "Shown" : "Hidden"} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(page.updated_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListPanel>
    </>
  );
}
