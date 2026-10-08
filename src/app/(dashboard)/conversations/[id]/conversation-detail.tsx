"use client";

import Link from "next/link";
import { EyeIcon, EyeOffIcon, ImageOffIcon, Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/common/page-header";
import { ReasonDialog } from "@/components/common/reason-dialog";
import { Section } from "@/components/common/section";
import { AsyncContent, ErrorState, ForbiddenState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { errorMessage } from "@/lib/api/client";
import { getConversation, getMessagePhoto, hideMessage, listMessages, unhideMessage } from "@/lib/api/messages";
import { formatDateTime } from "@/lib/format";
import { runAction } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { useCan } from "@/store/auth";
import type { Conversation, Message } from "@/types/api";

export function ConversationDetail({ id }: { id: string }) {
  const can = useCan();
  const allowed = can("messages.view");
  const { data, error, loading, reload } = useApi(allowed ? `conversation:${id}` : null, () => getConversation(id));

  if (!allowed) return <ForbiddenState />;

  return (
    <AsyncContent data={data} error={error} loading={loading} onRetry={reload}>
      {(conversation) => <ConversationView conversation={conversation} canManage={can("messages.manage")} />}
    </AsyncContent>
  );
}

function ConversationView({ conversation, canManage }: { conversation: Conversation; canManage: boolean }) {
  // Newest first from the API; older pages are added as staff scroll back.
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hiding, setHiding] = useState<Message | null>(null);
  const [showing, setShowing] = useState<Message | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMessages(conversation.id).then(
      (page) => {
        if (cancelled) return;
        setMessages(page.data);
        setHasMore(page.meta.has_more);
      },
      (err: unknown) => !cancelled && setError(err),
    );
    return () => {
      cancelled = true;
    };
  }, [conversation.id]);

  async function loadOlder() {
    if (!messages || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const page = await listMessages(conversation.id, messages[messages.length - 1].id);
      setMessages([...messages, ...page.data]);
      setHasMore(page.meta.has_more);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoadingOlder(false);
    }
  }

  function replace(message: Message) {
    setMessages((list) => list?.map((m) => (m.id === message.id ? message : m)) ?? null);
  }

  // Oldest at the top, like a chat.
  const ordered = messages ? [...messages].reverse() : [];

  return (
    <>
      <PageHeader
        back={{ href: "/conversations", label: "Messages" }}
        title={`${conversation.store.name} and ${conversation.buyer.name}`}
        description={`Last message ${formatDateTime(conversation.last_message_at)}. Staff can read this conversation but not write in it.`}
        actions={
          <>
            <Link href={`/conversations?store_id=${conversation.store.id}`} className="text-sm text-secondary hover:underline">
              Store&apos;s conversations
            </Link>
            <Link href={`/buyers/${conversation.buyer.id}`} className="text-sm text-secondary hover:underline">
              Buyer&apos;s account
            </Link>
          </>
        }
      />

      <Section title="Messages">
        {error && !messages ? (
          <ErrorState error={error} />
        ) : !messages ? (
          <LoadingState />
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          <div className="grid gap-3">
            {hasMore && (
              <Button variant="outline" size="sm" className="mx-auto" onClick={loadOlder} disabled={loadingOlder}>
                {loadingOlder && <Loader2Icon className="animate-spin" />}
                Older messages
              </Button>
            )}
            {ordered.map((message) => (
              <Bubble
                key={message.id}
                conversationId={conversation.id}
                message={message}
                storeName={conversation.store.name}
                buyerName={conversation.buyer.name}
                onHide={canManage ? () => setHiding(message) : undefined}
                onShow={canManage ? () => setShowing(message) : undefined}
              />
            ))}
          </div>
        )}
      </Section>

      <ReasonDialog
        open={hiding !== null}
        onOpenChange={(open) => !open && setHiding(null)}
        title="Hide this message"
        description="Both the buyer and the store see your reason instead of its text and photos. An email about it not sent yet is dropped."
        confirmLabel="Hide message"
        destructive
        required
        min={3}
        max={500}
        onSubmit={async (reason) => {
          replace(await hideMessage(conversation.id, hiding!.id, reason ?? ""));
          toast.success("Message hidden.");
        }}
      />
      <ConfirmDialog
        open={showing !== null}
        onOpenChange={(open) => !open && setShowing(null)}
        title="Show this message again"
        description="Both sides see its text and photos again."
        confirmLabel="Show message"
        onConfirm={() =>
          runAction(async () => replace(await unhideMessage(conversation.id, showing!.id)), "Message shown again.")
        }
      />
    </>
  );
}

function Bubble({
  conversationId,
  message,
  storeName,
  buyerName,
  onHide,
  onShow,
}: {
  conversationId: string;
  message: Message;
  storeName: string;
  buyerName: string;
  onHide?: () => void;
  onShow?: () => void;
}) {
  const fromStore = message.sender === "store";
  return (
    <div className={cn("flex", fromStore ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-4 py-3 ring-1 sm:max-w-[70%]",
          fromStore ? "bg-secondary-fixed/60 ring-secondary/10" : "bg-muted ring-foreground/5",
          message.hidden && "ring-2 ring-destructive/40",
        )}
      >
        <div className="mb-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{fromStore ? storeName : buyerName}</span>
          {message.auto_reply && <span>Automatic {message.auto_reply} reply</span>}
          <span>{formatDateTime(message.sent_at)}</span>
        </div>
        {message.body && <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>}
        {message.photos.length > 0 && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {message.photos.map((_, index) => (
              <MessagePhoto key={index} conversationId={conversationId} messageId={message.id} number={index + 1} />
            ))}
          </div>
        )}
        {message.hidden && (
          <p className="mt-2 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
            Hidden from both sides{message.hidden_reason ? `: ${message.hidden_reason}` : "."}
          </p>
        )}
        {(onHide || onShow) && (
          <div className="mt-2 flex justify-end">
            {message.hidden
              ? onShow && (
                  <Button variant="ghost" size="xs" onClick={onShow}>
                    <EyeIcon /> Show again
                  </Button>
                )
              : onHide && (
                  <Button variant="ghost" size="xs" onClick={onHide}>
                    <EyeOffIcon /> Hide
                  </Button>
                )}
          </div>
        )}
      </div>
    </div>
  );
}

function MessagePhoto({ conversationId, messageId, number }: { conversationId: string; messageId: string; number: number }) {
  const { data: url, error } = useApi(`message-photo:${messageId}:${number}`, async () =>
    URL.createObjectURL(await getMessagePhoto(conversationId, messageId, number)),
  );
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  const frame = "flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-background ring-1 ring-foreground/5";
  if (error) {
    return (
      <span className={frame} title="Could not load this photo">
        <ImageOffIcon className="size-5 text-muted-foreground" />
      </span>
    );
  }
  if (!url) {
    return (
      <span className={frame}>
        <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
      </span>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className={frame}>
      {/* eslint-disable-next-line @next/next/no-img-element -- an object URL of a private photo */}
      <img src={url} alt={`Photo ${number}`} className="size-full object-cover" />
    </a>
  );
}
