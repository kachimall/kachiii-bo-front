import { api, apiList, type Query } from "@/lib/api/client";
import { imageBody, type ImageInput } from "@/lib/api/images";
import type { Brand, CatalogAttribute, Category } from "@/types/api";

// Categories: GET returns the whole tree, not paginated.
export interface CategoryInput {
  name: string;
  slug: string;
  parent_id?: string | null;
  position?: number;
  is_active?: boolean;
}

export const listCategories = () => api<Category[]>("/admin/categories");
export const createCategory = (body: CategoryInput) => api<Category>("/admin/categories", { method: "POST", body });
export const updateCategory = (id: string, body: Partial<CategoryInput>) =>
  api<Category>(`/admin/categories/${id}`, { method: "PATCH", body });
export const deleteCategory = (id: string) => api<null>(`/admin/categories/${id}`, { method: "DELETE" });
export const uploadCategoryImage = (id: string, image: ImageInput) =>
  api<Category>(`/admin/categories/${id}/image`, { method: "POST", body: imageBody(image) });
export const deleteCategoryImage = (id: string) => api<null>(`/admin/categories/${id}/image`, { method: "DELETE" });

// Brands
export interface BrandInput {
  name: string;
  slug: string;
  is_active?: boolean;
}

export const listBrands = (query: Query & { q?: string; is_active?: boolean; page?: number; per_page?: number }) =>
  apiList<Brand>("/admin/brands", query);
export const createBrand = (body: BrandInput) => api<Brand>("/admin/brands", { method: "POST", body });
export const updateBrand = (id: string, body: Partial<BrandInput>) =>
  api<Brand>(`/admin/brands/${id}`, { method: "PATCH", body });
export const deleteBrand = (id: string) => api<null>(`/admin/brands/${id}`, { method: "DELETE" });
export const uploadBrandLogo = (id: string, image: ImageInput) =>
  api<Brand>(`/admin/brands/${id}/logo`, { method: "POST", body: imageBody(image) });
export const deleteBrandLogo = (id: string) => api<null>(`/admin/brands/${id}/logo`, { method: "DELETE" });

// Attributes: not paginated.
export interface AttributeInput {
  name: string;
  is_active?: boolean;
  position?: number;
}

export const listAttributes = () => api<CatalogAttribute[]>("/admin/attributes");
export const createAttribute = (body: AttributeInput) =>
  api<CatalogAttribute>("/admin/attributes", { method: "POST", body });
export const updateAttribute = (id: string, body: Partial<AttributeInput>) =>
  api<CatalogAttribute>(`/admin/attributes/${id}`, { method: "PATCH", body });
export const deleteAttribute = (id: string) => api<null>(`/admin/attributes/${id}`, { method: "DELETE" });
