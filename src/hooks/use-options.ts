"use client";

import { useApi } from "@/hooks/use-api";
import { listBrands, listCategories } from "@/lib/api/catalog";
import { listStores } from "@/lib/api/vendors";
import type { Category } from "@/types/api";

export interface Option {
  value: string;
  label: string;
}

/** The category tree flattened for a <select>, children indented under their parent. */
export function flattenCategories(tree: Category[], depth = 0): (Option & { category: Category; depth: number })[] {
  return tree.flatMap((category) => [
    { value: category.id, label: `${"  ".repeat(depth)}${category.name}`, category, depth },
    ...flattenCategories(category.children ?? [], depth + 1),
  ]);
}

export function useCategoryOptions(enabled = true) {
  const { data } = useApi(enabled ? "options:categories" : null, listCategories);
  return data ? flattenCategories(data) : [];
}

/** Up to 100 brands (the API's page limit), for filters and pickers. */
export function useBrandOptions(enabled = true): Option[] {
  const { data } = useApi(enabled ? "options:brands" : null, () => listBrands({ per_page: 100 }));
  return data?.data.map((b) => ({ value: b.id, label: b.name })) ?? [];
}

/** Up to 100 stores (the API's page limit), for filters and pickers. */
export function useStoreOptions(enabled = true): Option[] {
  const { data } = useApi(enabled ? "options:stores" : null, () => listStores({ per_page: 100 }));
  return data?.data.map((s) => ({ value: s.id, label: s.name })) ?? [];
}
