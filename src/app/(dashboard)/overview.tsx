"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { useApi } from "@/hooks/use-api";
import type { Paginated } from "@/types/api";
import { listOrders } from "@/lib/api/orders";
import { listLowStock, listProducts } from "@/lib/api/products";
import { listVendors } from "@/lib/api/vendors";
import { visibleNav } from "@/lib/nav";
import { useAuth, useCan } from "@/store/auth";

interface Queue {
  label: string;
  description: string;
  href: string;
  permission: string;
  load: () => Promise<Paginated<unknown>>;
}

// Work waiting for staff. Counts are each list's meta.total; there is no stats endpoint.
const QUEUES: Queue[] = [
  {
    label: "Vendor applications",
    description: "Pending review",
    href: "/vendors?status=pending",
    permission: "vendors.view",
    load: () => listVendors({ status: "pending", per_page: 1 }),
  },
  {
    label: "Products to review",
    description: "Pending review",
    href: "/products?status=pending_review",
    permission: "products.view",
    load: () => listProducts({ status: "pending_review", per_page: 1 }),
  },
  {
    label: "Flagged orders",
    description: "Repeated failed payments",
    href: "/orders?flagged=1",
    permission: "orders.view",
    load: () => listOrders({ flagged: true, per_page: 1 }),
  },
  {
    label: "Low stock",
    description: "Variants at or under their threshold",
    href: "/inventory/low-stock",
    permission: "products.view",
    load: () => listLowStock({ per_page: 1 }),
  },
];

export function Overview() {
  const user = useAuth((s) => s.user);
  const can = useCan();
  const queues = QUEUES.filter((q) => can(q.permission));
  const sections = visibleNav(can).flatMap((g) => g.items).filter((item) => item.href !== "/");

  return (
    <>
      <PageHeader title={`Welcome, ${user?.name?.split(" ")[0] ?? "back"}`} description="What needs attention across the marketplace." />

      {queues.length > 0 && (
        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {queues.map((queue) => (
            <QueueCard key={queue.label} queue={queue} />
          ))}
        </section>
      )}

      <section>
        <h2 className="mb-3 font-heading text-headline-sm">Sections</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-shadow hover:shadow-card-hover"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary-fixed text-on-primary-fixed-variant">
                <item.icon className="size-4" />
              </span>
              <span className="flex-1 font-medium">{item.label}</span>
              <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

function QueueCard({ queue }: { queue: Queue }) {
  const { data, error, loading } = useApi(queue.href, queue.load);
  const total = data?.meta.total;

  return (
    <Link
      href={queue.href}
      className="flex flex-col gap-1 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-shadow hover:shadow-card-hover"
    >
      <span className="text-sm text-muted-foreground">{queue.label}</span>
      <span className="font-heading text-headline-lg">
        {loading && total === undefined ? "…" : error ? "—" : (total ?? "—")}
      </span>
      <span className="text-xs text-muted-foreground">{queue.description}</span>
    </Link>
  );
}
