"use client";

import Link from "next/link";
import { PencilIcon } from "lucide-react";
import { useState } from "react";
import { FilterSelect, ListPanel } from "@/components/common/list-panel";
import { PageHeader } from "@/components/common/page-header";
import { Section } from "@/components/common/section";
import { ForbiddenState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { useQueryState } from "@/hooks/use-query-state";
import { listAdPlacements, listAds } from "@/lib/api/ads";
import { formatCount, formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { useCan } from "@/store/auth";
import type { AdPlacementKey, AdPlacementTerms, AdStatus } from "@/types/api";
import { AD_STATUS_LABELS, AD_STATUS_TONES } from "./ad-status";
import { PlacementDialog } from "./placement-dialog";

/**
 * Vendor ads (DECISIONS AD1): the three placements' weekly prices, and every ad the stores book.
 * Staff approve an ad (the store then pays to start it), reject it, or stop a running one.
 */
export function AdsView() {
  const can = useCan();
  const allowed = can("ads.view");
  const canManage = can("ads.manage");
  const query = useQueryState();
  const status = query.get("status") as AdStatus | "";
  const placement = query.get("placement") as AdPlacementKey | "";
  const placements = useApi(allowed ? "ad-placements" : null, listAdPlacements);
  const ads = useApi(allowed ? `ads?${query.key}` : null, () => listAds({ status, placement, page: query.page }));
  const [editing, setEditing] = useState<AdPlacementTerms | null>(null);

  if (!allowed) return <ForbiddenState />;

  return (
    <>
      <PageHeader
        title="Ads"
        description="Stores book ads in these placements by the week. Approve one and the store has 7 days to pay; it then runs and ends by itself."
      />

      <Section title="Placements" flush className="mb-6">
        {placements.error && !placements.data ? (
          <p className="p-5 text-sm text-muted-foreground">Could not load the placements.</p>
        ) : !placements.data ? (
          <p className="p-5 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Placement</TableHead>
                <TableHead className="text-right">Weekly price</TableHead>
                <TableHead className="text-right">Shown at once</TableHead>
                <TableHead>Bookings</TableHead>
                {canManage && <TableHead className="pr-5" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {placements.data.map((terms) => (
                <TableRow key={terms.key}>
                  <TableCell className="pl-5 font-medium">{terms.name}</TableCell>
                  <TableCell className="text-right">{formatMoney(terms.weekly_price)}</TableCell>
                  <TableCell className="text-right">{terms.shown_at_once}</TableCell>
                  <TableCell>
                    <StatusBadge status={terms.is_active ? "active" : "off"} label={terms.is_active ? "Open" : "Closed"} />
                  </TableCell>
                  {canManage && (
                    <TableCell className="pr-5 text-right">
                      <Button variant="outline" size="xs" onClick={() => setEditing(terms)}>
                        <PencilIcon /> Edit
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <ListPanel
        rows={ads.data?.data}
        meta={ads.data?.meta}
        loading={ads.loading}
        error={ads.error}
        onRetry={ads.reload}
        onPage={(page) => query.set({ page })}
        empty={{ title: "No ads found", description: status || placement ? "Try other filters." : "Ads appear here once stores book them." }}
        filters={
          <>
            <span className="mr-auto font-heading text-headline-sm">Ads</span>
            <FilterSelect
              label="Statuses"
              value={status}
              onChange={(value) => query.set({ status: value })}
              options={Object.entries(AD_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <FilterSelect
              label="Placements"
              value={placement}
              onChange={(value) => query.set({ placement: value })}
              options={(placements.data ?? []).map((p) => ({ value: p.key, label: p.name }))}
            />
          </>
        }
      >
        {(rows) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>For</TableHead>
                <TableHead>Placement</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Runs</TableHead>
                <TableHead className="text-right">Views / clicks</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((ad) => (
                <TableRow key={ad.id}>
                  <TableCell>
                    <Link href={`/ads/${ad.id}`} className="block font-medium hover:underline">
                      {ad.number}
                    </Link>
                    <span className="block text-xs text-muted-foreground">{formatDateTime(ad.created_at)}</span>
                  </TableCell>
                  <TableCell>{ad.store.name}</TableCell>
                  <TableCell className="max-w-48">
                    {ad.product ? (
                      <Link href={`/products/${ad.product.id}`} className="block truncate hover:underline">
                        {ad.product.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">The whole store</span>
                    )}
                  </TableCell>
                  <TableCell>{ad.placement.name}</TableCell>
                  <TableCell>
                    <StatusBadge status={ad.status} label={AD_STATUS_LABELS[ad.status]} tone={AD_STATUS_TONES[ad.status]} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {ad.starts_at ? `${formatDate(ad.starts_at)} – ${formatDate(ad.ends_at)}` : `${ad.weeks} ${ad.weeks === 1 ? "week" : "weeks"}`}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCount(ad.views)} / {formatCount(ad.clicks)}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatMoney(ad.amount, ad.currency_code)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListPanel>

      <PlacementDialog
        terms={editing}
        onClose={() => setEditing(null)}
        onSaved={(saved) => {
          placements.mutate((placements.data ?? []).map((p) => (p.key === saved.key ? saved : p)));
          setEditing(null);
        }}
      />
    </>
  );
}
