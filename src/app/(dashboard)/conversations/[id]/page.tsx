import type { Metadata } from "next";
import { ConversationDetail } from "./conversation-detail";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationPage({ params }: PageProps<"/conversations/[id]">) {
  const { id } = await params;
  return <ConversationDetail id={id} />;
}
