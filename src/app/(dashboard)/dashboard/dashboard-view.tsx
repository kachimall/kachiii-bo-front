"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/common/page-header";
import { PeriodFilter } from "@/components/common/period-filter";
import { Section } from "@/components/common/section";
import { AsyncContent, ForbiddenState } from "@/components/common/states";
import { useApi } from "@/hooks/use-api";
import { useQueryState } from "@/hooks/use-query-state";
import { getDashboard } from "@/lib/api/reports";
import { formatCount, formatDay, formatMoney, humanize } from "@/lib/format";
import { DASHBOARD_PERMISSIONS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useCan } from "@/store/auth";
import type { Dashboard } from "@/types/api";

/**
 * The marketplace over a period of UAE days (DECISIONS RP3): sales, orders, deliveries,
 * settlements, commissions, vendors and buyers. Each figure shows to staff who can view its
 * section; the API keeps the figures for five minutes.
 */
export function DashboardView() {
  const can = useCan();
  const allowed = can(DASHBOARD_PERMISSIONS);
  const query = useQueryState();
  const from = query.get("from");
  const to = query.get("to");
  const { data, error, loading, reload } = useApi(allowed ? `dashboard?${from}:${to}` : null, () => getDashboard({ from, to }));

  if (!allowed) return <ForbiddenState />;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={
          data
            ? `${formatDay(data.from)} to ${formatDay(data.to)}, UAE time. Figures refresh every five minutes.`
            : "The marketplace over a period, in UAE days."
        }
        actions={<PeriodFilter from={from} to={to} onChange={(period) => query.set(period)} />}
      />
      <AsyncContent data={data} error={error} loading={loading} onRetry={reload}>
        {(dashboard) => (
          <div className={cn("grid gap-6 transition-opacity", loading && "opacity-60")}>
            <Figures dashboard={dashboard} reportsLink={can("reports.view")} />
          </div>
        )}
      </AsyncContent>
    </>
  );
}

function Figures({ dashboard, reportsLink }: { dashboard: Dashboard; reportsLink: boolean }) {
  const { sales, orders, deliveries, settlements, commissions, vendors, buyers } = dashboard;
  const period = `from=${dashboard.from}&to=${dashboard.to}`;
  const report = (key: string) => (reportsLink ? `/reports?report=${key}&${period}` : undefined);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {sales && (
          <Stat
            label="Net sales"
            value={formatMoney(sales.net_sales)}
            hint={`${formatCount(sales.orders)} store orders, ${formatCount(sales.units)} units`}
            href={report("sales")}
          />
        )}
        {commissions && (
          <Stat
            label="Net commission"
            value={formatMoney(commissions.net)}
            hint={`${formatMoney(commissions.on_returns)} given back on returns`}
            href={report("commissions")}
          />
        )}
        {orders && (
          <Stat
            label="Orders placed"
            value={formatCount(orders.placed)}
            hint={`${formatCount(orders.online)} online, ${formatCount(orders.cash_on_delivery)} cash on delivery`}
          />
        )}
        {deliveries && (
          <Stat
            label="Packages"
            value={formatCount(deliveries.packages)}
            hint={`${formatCount(deliveries.delivered)} delivered, ${formatCount(deliveries.awaiting_pickup)} not with the courier yet`}
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {sales && (
          <Section title="Sales" actions={report("sales") && <ReportLink href={report("sales")!} />}>
            <Rows
              rows={[
                ["Sales", formatMoney(sales.sales)],
                ["Discounts", formatMoney(sales.discounts)],
                ["Net sales", formatMoney(sales.net_sales), true],
                ["Store orders", formatCount(sales.orders)],
                ["Units", formatCount(sales.units)],
              ]}
            />
          </Section>
        )}

        {orders && (
          <Section title="Store orders placed, by where they are now">
            <Rows rows={Object.entries(orders.store_orders).map(([status, count]) => [humanize(status), formatCount(count)])} />
          </Section>
        )}

        {deliveries && (
          <Section title="Deliveries, by the courier's last report">
            <Rows
              rows={Object.entries(deliveries)
                .filter(([key]) => key !== "packages")
                .map(([status, count]) => [status === "awaiting_pickup" ? "Not with the courier yet" : humanize(status), formatCount(count)])}
            />
          </Section>
        )}

        {settlements && (
          <Section title="Settlements" actions={report("payouts") && <ReportLink href={report("payouts")!} />}>
            <Rows
              rows={[
                ["Payouts", formatCount(settlements.payouts)],
                ["Released", formatMoney(str(settlements.released)), true],
                ["Settled by noqodi", formatMoney(str(settlements.noqodi_settled))],
                ["Due from noqodi", formatMoney(str(settlements.noqodi_due))],
                ["Paid by KACHI", formatMoney(str(settlements.kachi_paid))],
                ["Due from KACHI", formatMoney(str(settlements.kachi_due))],
              ]}
            />
          </Section>
        )}

        {commissions && (
          <Section title="Commissions" actions={report("commissions") && <ReportLink href={report("commissions")!} />}>
            <Rows
              rows={[
                ["On sales", formatMoney(commissions.on_sales)],
                ["Taken back on returns", formatMoney(commissions.on_returns)],
                ["Net commission", formatMoney(commissions.net), true],
              ]}
            />
          </Section>
        )}

        {vendors && (
          <Section title="Vendors">
            <Rows
              rows={[
                ["Active now", formatCount(vendors.active)],
                ["Selling in the period", formatCount(vendors.selling)],
                ["Approved in the period", formatCount(vendors.approved)],
                ["Applications to review", formatCount(vendors.to_review)],
              ]}
            />
          </Section>
        )}

        {buyers && (
          <Section title="Buyers">
            <Rows
              rows={[
                ["Registered", formatCount(buyers.registered)],
                ["New in the period", formatCount(buyers.new)],
                ["Ordered in the period", formatCount(buyers.ordering)],
              ]}
            />
          </Section>
        )}
      </div>
    </>
  );
}

function str(value: string | number | null | undefined): string | null {
  return value === null || value === undefined ? null : String(value);
}

function Stat({ label, value, hint, href }: { label: string; value: string; hint?: string; href?: string }) {
  const body = (
    <>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-heading text-headline-md">{value}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </>
  );
  const className = "flex flex-col gap-1 rounded-xl bg-card p-4 ring-1 ring-foreground/10";
  return href ? (
    <Link href={href} className={cn(className, "transition-shadow hover:shadow-card-hover")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function Rows({ rows }: { rows: [string, ReactNode, boolean?][] }) {
  return (
    <dl className="grid gap-2 text-sm">
      {rows.map(([label, value, strong]) => (
        <div key={label} className={cn("flex justify-between gap-4", strong && "font-medium")}>
          <dt className={strong ? undefined : "text-muted-foreground"}>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ReportLink({ href }: { href: string }) {
  return (
    <Link href={href} className="text-sm text-secondary hover:underline">
      Open report
    </Link>
  );
}
