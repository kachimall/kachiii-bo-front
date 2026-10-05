"use client";

import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DetailList } from "@/components/common/detail-list";
import { PageHeader } from "@/components/common/page-header";
import { ReasonDialog } from "@/components/common/reason-dialog";
import { Section } from "@/components/common/section";
import { AsyncContent } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { errorMessage } from "@/lib/api/client";
import { deleteProductImage, getProduct, moderateProduct } from "@/lib/api/products";
import { crumbName, formatDateTime, formatMoney, formatOptions, humanize } from "@/lib/format";
import { useCan } from "@/store/auth";
import type { ModerationStatus, Product, ProductImage, ProductStatus } from "@/types/api";
import { VariantInventoryDialog } from "./variant-inventory-dialog";

interface ModerationAction {
  to: ModerationStatus;
  label: string;
  destructive?: boolean;
  reason: "required" | "optional" | "none";
  description: string;
}

// What staff may do from each status (ProductStatus::allowedTargets, staff side).
function actionsFor(status: ProductStatus | undefined): ModerationAction[] {
  const approve: ModerationAction = { to: "active", label: "Approve", reason: "none", description: "The listing goes live on the storefront." };
  const reject: ModerationAction = { to: "rejected", label: "Reject", destructive: true, reason: "required", description: "The vendor sees the reason and can fix and resubmit the listing." };
  const ban: ModerationAction = { to: "banned", label: "Ban", destructive: true, reason: "required", description: "The listing comes off the storefront and the vendor cannot republish it." };
  const unban: ModerationAction = { to: "inactive", label: "Lift ban", reason: "none", description: "The listing becomes inactive; the vendor decides when it goes live again." };

  switch (status) {
    case "pending_review":
      return [approve, reject, ban];
    case "draft":
    case "rejected":
    case "active":
    case "inactive":
      return [ban];
    case "banned":
      return [unban];
    default:
      return [];
  }
}

export function ProductDetail({ id }: { id: string }) {
  const { data, error, loading, reload, mutate } = useApi(`product:${id}`, () => getProduct(id));

  return (
    <AsyncContent data={data} error={error} loading={loading} onRetry={reload}>
      {(product) => <ProductView product={product} onChange={mutate} onReload={reload} />}
    </AsyncContent>
  );
}

function ProductView({ product, onChange, onReload }: { product: Product; onChange: (p: Product) => void; onReload: () => void }) {
  const can = useCan();
  const canModerate = can("products.manage");
  const [action, setAction] = useState<ModerationAction | null>(null);
  const [purgeImages, setPurgeImages] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<ProductImage | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);

  async function moderate(reason: string | null) {
    if (!action) return;
    const updated = await moderateProduct(product.id, {
      status: action.to,
      reason,
      ...(action.to === "banned" ? { purge_images: purgeImages } : {}),
    });
    onChange(updated);
    toast.success(`Product ${humanize(updated.status).toLowerCase()}.`);
  }

  async function removeImage() {
    if (!imageToDelete) return false;
    try {
      await deleteProductImage(product.id, imageToDelete.id);
      toast.success("Image removed.");
      onReload();
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    }
  }

  const variant = product.variants?.find((v) => v.id === variantId) ?? null;

  return (
    <>
      <PageHeader
        back={{ href: "/products", label: "Products" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {product.name} <StatusBadge status={product.status} />
          </span>
        }
        description={`${product.sku} · ${product.store.name}`}
        actions={
          canModerate &&
          actionsFor(product.status).map((a) => (
            <Button
              key={a.to}
              variant={a.destructive ? "destructive" : a.to === "active" ? "default" : "outline"}
              onClick={() => {
                setPurgeImages(false);
                setAction(a);
              }}
            >
              {a.label}
            </Button>
          ))
        }
      />

      {product.moderation_reason && (
        <div className="mb-6 rounded-xl bg-destructive/5 p-4 text-sm ring-1 ring-destructive/20">
          <p className="font-medium text-destructive">Moderation reason</p>
          <p className="mt-1">{product.moderation_reason}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <Section title="Images">
            {product.images && product.images.length > 0 ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {product.images.map((image) => (
                  <li key={image.id} className="group relative overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10">
                    {image.thumbnail_url || image.url ? (
                      <a href={image.url ?? image.thumbnail_url ?? undefined} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element -- absolute storage URLs from the API host */}
                        <img src={image.thumbnail_url ?? image.url ?? ""} alt={image.alt_text ?? ""} className="aspect-square w-full object-cover" />
                      </a>
                    ) : (
                      <div className="flex aspect-square items-center justify-center text-xs text-muted-foreground">
                        {humanize(image.status)}
                      </div>
                    )}
                    {canModerate && (
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        className="absolute top-1.5 right-1.5 bg-card opacity-0 shadow group-hover:opacity-100 focus-visible:opacity-100"
                        aria-label="Delete image"
                        onClick={() => setImageToDelete(image)}
                      >
                        <Trash2Icon />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No images.</p>
            )}
          </Section>

          <Section title="Description">
            <p className="text-sm whitespace-pre-line">{product.description || "—"}</p>
            {product.metadata && product.metadata.length > 0 && (
              <DetailList className="mt-5" items={product.metadata.map((m) => ({ label: m.name, value: m.value }))} />
            )}
          </Section>

          <Section title="Variants and inventory" flush>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Variant</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>On hand</TableHead>
                  <TableHead>Reserved</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(product.variants ?? []).map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="pl-5">
                      <span className="block font-medium">{formatOptions(v.options)}</span>
                      <span className="block text-xs text-muted-foreground">
                        {v.sku}
                        {v.seller_sku ? ` · ${v.seller_sku}` : ""}
                      </span>
                    </TableCell>
                    <TableCell>
                      {v.sale_price ? (
                        <>
                          {formatMoney(v.sale_price, v.currency_code)}{" "}
                          <span className="text-xs text-muted-foreground line-through">{v.price}</span>
                        </>
                      ) : (
                        formatMoney(v.price, v.currency_code)
                      )}
                    </TableCell>
                    <TableCell>{v.inventory?.on_hand ?? v.stock}</TableCell>
                    <TableCell>{v.inventory?.reserved ?? "—"}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        {v.inventory?.available ?? "—"}
                        {v.inventory?.is_low_stock && <StatusBadge status="low" label="Low" tone="warning" />}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={v.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setVariantId(v.id)}>
                        Stock history
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        </div>

        <Section title="Details" className="h-fit">
          <DetailList
            className="sm:grid-cols-1"
            items={[
              { label: "Store", value: product.store.name },
              { label: "Category", value: product.category?.breadcrumbs.map(crumbName).join(" › ") || product.category?.name },
              { label: "Brand", value: product.brand?.name ?? "—" },
              { label: "Tax class", value: humanize(product.tax_class) },
              { label: "Fulfilment", value: product.ships_from_provider ? "Ships from provider" : "Vendor ships" },
              { label: "Submitted", value: formatDateTime(product.submitted_at) },
              { label: "Approved", value: formatDateTime(product.approved_at) },
              { label: "Published", value: formatDateTime(product.published_at) },
              { label: "Updated", value: formatDateTime(product.updated_at) },
            ]}
          />
        </Section>
      </div>

      <ReasonDialog
        open={action !== null}
        onOpenChange={(open) => !open && setAction(null)}
        title={action ? `${action.label} “${product.name}”?` : ""}
        description={action?.description}
        confirmLabel={action?.label ?? ""}
        destructive={action?.destructive}
        required={action?.reason === "required"}
        onSubmit={moderate}
      >
        {action?.to === "banned" && (
          <Label className="font-normal">
            <Checkbox checked={purgeImages} onCheckedChange={(checked) => setPurgeImages(checked === true)} />
            Also delete every image and file of this listing
          </Label>
        )}
      </ReasonDialog>

      <ConfirmDialog
        open={imageToDelete !== null}
        onOpenChange={(open) => !open && setImageToDelete(null)}
        title="Delete this image?"
        description="The image is removed from the listing for good."
        confirmLabel="Delete"
        destructive
        onConfirm={removeImage}
      />

      {variant && (
        <VariantInventoryDialog
          productId={product.id}
          variant={variant}
          canAdjust={can("inventory.manage")}
          onClose={() => setVariantId(null)}
          onAdjusted={onReload}
        />
      )}
    </>
  );
}
