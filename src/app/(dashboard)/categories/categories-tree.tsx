"use client";

import { ChevronRightIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/common/page-header";
import { AsyncContent, EmptyState, ForbiddenState } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Thumb } from "@/components/common/thumb";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { deleteCategory, listCategories } from "@/lib/api/catalog";
import { runAction } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { useCan } from "@/store/auth";
import type { Category } from "@/types/api";
import { CategoryDialog, type CategoryDialogState } from "./category-dialog";

export function CategoriesTree() {
  const can = useCan();
  const allowed = can("products.view");
  const canManage = can("categories.manage");
  const { data, error, loading, reload } = useApi(allowed ? "categories" : null, listCategories);
  const [dialog, setDialog] = useState<CategoryDialogState | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  if (!allowed) return <ForbiddenState />;

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <PageHeader
        title="Categories"
        description="The storefront's category tree. Order siblings with their position."
        actions={
          canManage && (
            <Button onClick={() => setDialog({ mode: "create", parentId: null })}>
              <PlusIcon /> New category
            </Button>
          )
        }
      />
      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <AsyncContent data={data} error={error} loading={loading} onRetry={reload}>
          {(tree) =>
            tree.length === 0 ? (
              <EmptyState title="No categories yet" />
            ) : (
              <ul role="tree" aria-label="Categories" className="divide-y">
                {tree.map((category) => (
                  <Node
                    key={category.id}
                    category={category}
                    depth={0}
                    collapsed={collapsed}
                    onToggle={toggle}
                    canManage={canManage}
                    onAdd={(parent) => setDialog({ mode: "create", parentId: parent.id })}
                    onEdit={(c) => setDialog({ mode: "edit", category: c })}
                    onDelete={setToDelete}
                  />
                ))}
              </ul>
            )
          }
        </AsyncContent>
      </div>

      <CategoryDialog
        state={dialog}
        tree={data ?? []}
        onClose={() => setDialog(null)}
        onSaved={reload}
        onImageChange={(category) => setDialog({ mode: "edit", category })}
      />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete ${toDelete?.name ?? "category"}?`}
        description="A category that still has subcategories or products cannot be deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!toDelete) return false;
          const ok = await runAction(() => deleteCategory(toDelete.id), "Category deleted.");
          if (ok) reload();
          return ok;
        }}
      />
    </>
  );
}

interface NodeProps {
  category: Category;
  depth: number;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  canManage: boolean;
  onAdd: (parent: Category) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

function Node({ category, depth, collapsed, onToggle, canManage, onAdd, onEdit, onDelete }: NodeProps) {
  const children = category.children ?? [];
  const open = !collapsed.has(category.id);

  return (
    <li role="treeitem" aria-expanded={children.length > 0 ? open : undefined} aria-selected={false}>
      <div className="group flex items-center gap-2 py-2 pr-3 hover:bg-muted/50" style={{ paddingLeft: `${0.75 + depth * 1.5}rem` }}>
        <button
          type="button"
          onClick={() => onToggle(category.id)}
          className={cn("flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted", children.length === 0 && "invisible")}
          aria-label={open ? `Collapse ${category.name}` : `Expand ${category.name}`}
        >
          <ChevronRightIcon className={cn("size-4 transition-transform", open && "rotate-90")} />
        </button>
        <Thumb src={category.image_url} alt="" className="size-8" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{category.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            /{category.slug} · position {category.position}
            {children.length > 0 && ` · ${children.length} subcategor${children.length === 1 ? "y" : "ies"}`}
          </p>
        </div>
        {category.is_active === false && <StatusBadge status="inactive" />}
        {canManage && (
          <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
            <Button variant="ghost" size="icon-sm" onClick={() => onAdd(category)} aria-label={`Add a subcategory to ${category.name}`}>
              <PlusIcon />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => onEdit(category)} aria-label={`Edit ${category.name}`}>
              <PencilIcon />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => onDelete(category)} aria-label={`Delete ${category.name}`}>
              <Trash2Icon />
            </Button>
          </div>
        )}
      </div>
      {open && children.length > 0 && (
        <ul role="group" className="divide-y border-t">
          {children.map((child) => (
            <Node
              key={child.id}
              category={child}
              depth={depth + 1}
              collapsed={collapsed}
              onToggle={onToggle}
              canManage={canManage}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
