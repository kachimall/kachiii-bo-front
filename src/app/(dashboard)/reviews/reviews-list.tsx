"use client";

import Link from "next/link";
import { EyeIcon, EyeOffIcon, StarIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { FilterSelect, ListPanel } from "@/components/common/list-panel";
import { PageHeader } from "@/components/common/page-header";
import { ReasonDialog } from "@/components/common/reason-dialog";
import { ForbiddenState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Thumb } from "@/components/common/thumb";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { useQueryState } from "@/hooks/use-query-state";
import { hideReview, listReviews, unhideReview } from "@/lib/api/messages";
import { formatDateTime } from "@/lib/format";
import { runAction } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { useCan } from "@/store/auth";
import type { Review } from "@/types/api";

/**
 * Product reviews (DECISIONS RV1), newest first. Staff with reviews.moderate hide a review with
 * the reason the buyer and the store see; the product's and the store's ratings stop counting it.
 */
export function ReviewsList() {
  const can = useCan();
  const allowed = can("products.view");
  const canModerate = can("reviews.moderate");
  const query = useQueryState();
  const visibility = query.get("visibility");
  const rating = query.get("rating");
  const productId = query.get("product_id");
  const { data, error, loading, reload } = useApi(allowed ? `reviews?${query.key}` : null, () =>
    listReviews({
      hidden: visibility === "hidden" ? true : visibility === "visible" ? false : undefined,
      rating: rating ? Number(rating) : undefined,
      product_id: productId,
      page: query.page,
    }),
  );
  const [hiding, setHiding] = useState<Review | null>(null);
  const [showing, setShowing] = useState<Review | null>(null);

  if (!allowed) return <ForbiddenState />;

  return (
    <>
      <PageHeader
        title="Reviews"
        description="What buyers wrote about the products they received, newest first. A hidden review leaves the shop and the ratings."
      />
      <ListPanel
        rows={data?.data}
        meta={data?.meta}
        loading={loading}
        error={error}
        onRetry={reload}
        onPage={(page) => query.set({ page })}
        empty={{ title: "No reviews found", description: visibility || rating || productId ? "Try other filters." : undefined }}
        filters={
          <>
            <FilterSelect
              label="Reviews"
              value={visibility}
              onChange={(value) => query.set({ visibility: value })}
              options={[
                { value: "visible", label: "Shown in the shop" },
                { value: "hidden", label: "Hidden by staff" },
              ]}
            />
            <FilterSelect
              label="Ratings"
              value={rating}
              onChange={(value) => query.set({ rating: value })}
              options={["5", "4", "3", "2", "1"].map((n) => ({ value: n, label: `${n} star${n === "1" ? "" : "s"}` }))}
            />
            {productId && (
              <Button variant="secondary" size="sm" onClick={() => query.set({ product_id: null })}>
                One product only · show all
              </Button>
            )}
          </>
        }
      >
        {(rows) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Written</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Review</TableHead>
                <TableHead>Status</TableHead>
                {canModerate && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((review) => (
                <TableRow key={review.id} className={cn(review.hidden && "bg-muted/40")}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    <span className="block">{formatDateTime(review.created_at)}</span>
                    <span className="block text-xs">{review.author}</span>
                  </TableCell>
                  <TableCell className="max-w-56">
                    <Link href={`/products/${review.product.id}`} className="block truncate font-medium hover:underline">
                      {review.product.name}
                    </Link>
                    {review.variant && <span className="block text-xs text-muted-foreground">{review.variant}</span>}
                    <button
                      type="button"
                      className="text-xs text-secondary hover:underline"
                      onClick={() => query.set({ product_id: review.product.id })}
                    >
                      Its reviews
                    </button>
                  </TableCell>
                  <TableCell>
                    <Stars rating={review.rating} />
                  </TableCell>
                  <TableCell className="max-w-96 whitespace-normal">
                    {review.comment ? <p className="line-clamp-4 text-sm">{review.comment}</p> : <span className="text-muted-foreground">No comment</span>}
                    {review.photo_urls.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {review.photo_urls.map((url, index) => (
                          <a key={url} href={url} target="_blank" rel="noreferrer">
                            <Thumb src={url} alt={`Photo ${index + 1}`} />
                          </a>
                        ))}
                      </div>
                    )}
                    {review.reply && (
                      <p className="mt-2 border-l-2 pl-2 text-xs text-muted-foreground">
                        <span className="font-medium">Store reply:</span> {review.reply.text}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="max-w-56 whitespace-normal">
                    <StatusBadge status={review.hidden ? "hidden" : "visible"} tone={review.hidden ? "danger" : "success"} />
                    {review.hidden_reason && <p className="mt-1 text-xs text-muted-foreground">{review.hidden_reason}</p>}
                  </TableCell>
                  {canModerate && (
                    <TableCell className="text-right">
                      {review.hidden ? (
                        <Button variant="outline" size="xs" onClick={() => setShowing(review)}>
                          <EyeIcon /> Show
                        </Button>
                      ) : (
                        <Button variant="outline" size="xs" onClick={() => setHiding(review)}>
                          <EyeOffIcon /> Hide
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListPanel>

      <ReasonDialog
        open={hiding !== null}
        onOpenChange={(open) => !open && setHiding(null)}
        title="Hide this review"
        description="It leaves the shop and the ratings. The buyer and the store see your reason."
        confirmLabel="Hide review"
        destructive
        required
        min={3}
        max={500}
        onSubmit={async (reason) => {
          await hideReview(hiding!.id, reason ?? "");
          toast.success("Review hidden.");
          reload();
        }}
      />
      <ConfirmDialog
        open={showing !== null}
        onOpenChange={(open) => !open && setShowing(null)}
        title="Show this review again"
        description="It returns to the shop, and the ratings count it again."
        confirmLabel="Show review"
        onConfirm={async () => {
          const done = await runAction(() => unhideReview(showing!.id), "Review shown again.");
          if (done) reload();
          return done;
        }}
      />
    </>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5`} title={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} className={cn("size-3.5", n <= rating ? "fill-current text-star" : "text-muted-foreground/40")} />
      ))}
    </span>
  );
}
