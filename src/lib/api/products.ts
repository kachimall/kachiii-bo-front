import { api, apiList, type Query } from "@/lib/api/client";
import type { Inventory, InventoryMovement, ModerationStatus, Product } from "@/types/api";

export interface ProductFilters extends Query {
  status?: string;
  q?: string;
  vendor_id?: string;
  store_id?: string;
  category_id?: string;
  brand_id?: string;
  page?: number;
  per_page?: number;
}

export const listProducts = (filters: ProductFilters) => apiList<Product>("/admin/products", filters);
export const getProduct = (id: string) => api<Product>(`/admin/products/${id}`);

export const moderateProduct = (
  id: string,
  body: { status: ModerationStatus; reason?: string | null; purge_images?: boolean },
) => api<Product>(`/admin/products/${id}/status`, { method: "PUT", body });

export const deleteProductImage = (productId: string, imageId: string) =>
  api<null>(`/admin/products/${productId}/images/${imageId}`, { method: "DELETE" });

export const listLowStock = (query: Query & { vendor_id?: string; page?: number; per_page?: number }) =>
  apiList<Inventory>("/admin/inventory/low-stock", query);

export const listMovements = (productId: string, variantId: string, query: Query & { type?: string; page?: number } = {}) =>
  apiList<InventoryMovement>(`/admin/products/${productId}/variants/${variantId}/inventory/movements`, query);

export const recordMovement = (
  productId: string,
  variantId: string,
  body: { type: "purchase" | "adjustment"; quantity: number; expected_on_hand: number; note?: string | null },
) =>
  api<{ movement: InventoryMovement; inventory: Inventory }>(
    `/admin/products/${productId}/variants/${variantId}/inventory/movements`,
    { method: "POST", body },
  );
