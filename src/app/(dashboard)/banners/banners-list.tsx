"use client";

import { ArrowDownIcon, ArrowUpIcon, EyeIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/common/page-header";
import { Section } from "@/components/common/section";
import { AsyncContent, EmptyState, ForbiddenState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Thumb } from "@/components/common/thumb";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { errorMessage } from "@/lib/api/client";
import { deleteBanner, listBanners, reorderBanners } from "@/lib/api/content";
import { formatUaeDateTime } from "@/lib/format";
import { runAction } from "@/lib/forms";
import { useCan } from "@/store/auth";
import type { Banner, BannerPlacement } from "@/types/api";
import { BannerDialog, PLACEMENT_LABELS, type BannerDialogState } from "./banner-dialog";

// kachi.content.max_banners_per_placement; the API answers 409 past it.
const MAX_PER_PLACEMENT = 10;

const PLACEMENTS: { value: BannerPlacement; description: string }[] = [
  { value: "home_carousel", description: "The home page's main slider." },
  { value: "home_side", description: "The promo cards beside the slider on a wide screen." },
];

/** Home banners (DECISIONS CN1): content.view lists them, content.manage edits and orders them. */
export function BannersList() {
  const can = useCan();
  const allowed = can("content.view");
  const canManage = can("content.manage");
  const { data, error, loading, reload, mutate } = useApi(allowed ? "banners" : null, () => listBanners());
  const [dialog, setDialog] = useState<BannerDialogState>(undefined);
  const [toDelete, setToDelete] = useState<Banner | null>(null);
  const [moving, setMoving] = useState<BannerPlacement | null>(null);

  if (!allowed) return <ForbiddenState />;

  /** Puts a changed banner in the list (a moved one goes last in its new placement). */
  function upsert(banner: Banner) {
    if (!data) return reload();
    const rest = data.filter((b) => b.id !== banner.id);
    mutate([...rest, banner].sort((a, b) => a.placement.localeCompare(b.placement) || a.position - b.position));
    setDialog((current) => (current ? { banner, placement: banner.placement } : current));
  }

  async function move(placement: BannerPlacement, rows: Banner[], index: number, by: -1 | 1) {
    const ids = rows.map((b) => b.id);
    [ids[index], ids[index + by]] = [ids[index + by], ids[index]];
    setMoving(placement);
    try {
      const ordered = await reorderBanners(placement, ids);
      mutate([...(data ?? []).filter((b) => b.placement !== placement), ...ordered]);
    } catch (error) {
      // 422 when someone else added or deleted a banner meanwhile: show theirs.
      toast.error(errorMessage(error));
      reload();
    } finally {
      setMoving(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Banners"
        description="Home page banners, in the order the shop shows them. Times are in UAE time (GMT+4)."
      />
      <AsyncContent data={data} error={error} loading={loading} onRetry={reload}>
        {(banners) => (
          <div className="grid gap-6">
            {PLACEMENTS.map(({ value: placement, description }) => {
              const rows = banners.filter((b) => b.placement === placement).sort((a, b) => a.position - b.position);
              const full = rows.length >= MAX_PER_PLACEMENT;
              return (
                <Section
                  key={placement}
                  flush
                  title={
                    <span className="flex flex-wrap items-baseline gap-2">
                      {PLACEMENT_LABELS[placement]}
                      <span className="text-sm font-normal text-muted-foreground">
                        {rows.length} of {MAX_PER_PLACEMENT} · {description}
                      </span>
                    </span>
                  }
                  actions={
                    canManage && (
                      <Button
                        size="sm"
                        disabled={full}
                        title={full ? "A placement holds at most 10 banners. Delete one first." : undefined}
                        onClick={() => setDialog({ banner: null, placement })}
                      >
                        <PlusIcon /> New banner
                      </Button>
                    )
                  }
                >
                  {rows.length === 0 ? (
                    <EmptyState title="No banners here yet" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {canManage && <TableHead className="w-20">Order</TableHead>}
                          <TableHead>Banner</TableHead>
                          <TableHead>Schedule</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((banner, index) => (
                          <TableRow key={banner.id}>
                            {canManage && (
                              <TableCell>
                                <span className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    disabled={index === 0 || moving !== null}
                                    onClick={() => move(placement, rows, index, -1)}
                                    aria-label={`Move ${banner.name} up`}
                                  >
                                    <ArrowUpIcon />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    disabled={index === rows.length - 1 || moving !== null}
                                    onClick={() => move(placement, rows, index, 1)}
                                    aria-label={`Move ${banner.name} down`}
                                  >
                                    <ArrowDownIcon />
                                  </Button>
                                </span>
                              </TableCell>
                            )}
                            <TableCell>
                              <span className="flex items-center gap-3">
                                <Thumb src={banner.desktop_image_url} alt="" className="h-10 w-20" />
                                <span className="min-w-0">
                                  <span className="block font-medium">{banner.name}</span>
                                  <span className="block max-w-72 truncate text-xs text-muted-foreground">
                                    {banner.headline ?? banner.alt_text}
                                  </span>
                                </span>
                              </span>
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                              {banner.starts_at || banner.ends_at ? (
                                <>
                                  <span className="block">From {banner.starts_at ? formatUaeDateTime(banner.starts_at) : "now"}</span>
                                  <span className="block">Until {banner.ends_at ? formatUaeDateTime(banner.ends_at) : "switched off"}</span>
                                </>
                              ) : (
                                "Always"
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="flex flex-col gap-1">
                                <StatusBadge status={banner.status} />
                                {banner.status !== "off" && !banner.desktop_image_url && (
                                  <span className="text-xs text-destructive">No desktop image</span>
                                )}
                              </span>
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setDialog({ banner, placement })}
                                aria-label={`${canManage ? "Edit" : "View"} ${banner.name}`}
                              >
                                {canManage ? <PencilIcon /> : <EyeIcon />}
                              </Button>
                              {canManage && (
                                <Button variant="ghost" size="icon-sm" onClick={() => setToDelete(banner)} aria-label={`Delete ${banner.name}`}>
                                  <Trash2Icon />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Section>
              );
            })}
          </div>
        )}
      </AsyncContent>

      <BannerDialog state={dialog} readOnly={!canManage} onClose={() => setDialog(undefined)} onChange={upsert} />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete ${toDelete?.name ?? "banner"}?`}
        description="The banner and its images are deleted, and it leaves the home page at once."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!toDelete) return false;
          const ok = await runAction(() => deleteBanner(toDelete.id), "Banner deleted.");
          if (ok) reload();
          return ok;
        }}
      />
    </>
  );
}
