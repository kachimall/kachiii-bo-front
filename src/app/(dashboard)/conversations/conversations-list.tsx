"use client";

import Link from "next/link";
import { EyeOffIcon, ImageIcon, XIcon } from "lucide-react";
import { ListPanel } from "@/components/common/list-panel";
import { PageHeader } from "@/components/common/page-header";
import { ForbiddenState } from "@/components/common/states";
import { Thumb } from "@/components/common/thumb";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { useQueryState } from "@/hooks/use-query-state";
import { listConversations } from "@/lib/api/messages";
import { formatDateTime } from "@/lib/format";
import { useCan } from "@/store/auth";
import type { Message } from "@/types/api";

/**
 * Buyer-store conversations (DECISIONS MS3), the latest message first. Staff read them in full
 * and, with messages.manage, hide a misused message; they never write in one.
 */
export function ConversationsList() {
  const can = useCan();
  const allowed = can("messages.view");
  const query = useQueryState();
  const storeId = query.get("store_id");
  const buyerId = query.get("buyer_id");
  const { data, error, loading, reload } = useApi(allowed ? `conversations?${query.key}` : null, () =>
    listConversations({ store_id: storeId, buyer_id: buyerId, page: query.page }),
  );

  if (!allowed) return <ForbiddenState />;

  const first = data?.data[0];

  return (
    <>
      <PageHeader
        title="Messages"
        description="Conversations buyers started with stores, the latest first. Staff can read them and hide a misused message."
      />
      <ListPanel
        rows={data?.data}
        meta={data?.meta}
        loading={loading}
        error={error}
        onRetry={reload}
        onPage={(page) => query.set({ page })}
        empty={{ title: "No conversations", description: storeId || buyerId ? "Try clearing the filter." : undefined }}
        filters={
          storeId || buyerId ? (
            <>
              {storeId && (
                <Button variant="secondary" size="sm" onClick={() => query.set({ store_id: null })}>
                  Store: {first?.store.id === storeId ? first.store.name : "one store"} <XIcon />
                </Button>
              )}
              {buyerId && (
                <Button variant="secondary" size="sm" onClick={() => query.set({ buyer_id: null })}>
                  Buyer: {first?.buyer.id === buyerId ? first.buyer.name : "one buyer"} <XIcon />
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        {(rows) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Latest message</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((conversation) => (
                <TableRow key={conversation.id}>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <Thumb src={conversation.store.logo_url} alt="" className="size-8" />
                      <span className="flex flex-col">
                        <Link href={`/conversations/${conversation.id}`} className="font-medium hover:underline">
                          {conversation.store.name}
                        </Link>
                        <button
                          type="button"
                          className="w-fit text-xs text-muted-foreground hover:underline"
                          onClick={() => query.set({ store_id: conversation.store.id })}
                        >
                          All of its conversations
                        </button>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <Link href={`/buyers/${conversation.buyer.id}`} className="hover:underline">
                      {conversation.buyer.name}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-96">
                    <Link href={`/conversations/${conversation.id}`} className="block truncate text-sm hover:underline">
                      {conversation.last_message ? <Preview message={conversation.last_message} /> : <span className="text-muted-foreground">No messages</span>}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(conversation.last_message_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListPanel>
    </>
  );
}

function Preview({ message }: { message: Message }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      <span className="shrink-0 text-xs text-muted-foreground">{message.sender === "store" ? "Store:" : "Buyer:"}</span>
      {message.hidden && <EyeOffIcon className="size-3.5 shrink-0 text-destructive" aria-label="Hidden" />}
      {message.photos.length > 0 && <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" aria-label="Photos" />}
      <span className="truncate">{message.body ?? (message.photos.length > 0 ? "Photo" : "")}</span>
    </span>
  );
}
