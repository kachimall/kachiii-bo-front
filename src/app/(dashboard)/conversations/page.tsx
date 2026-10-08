import type { Metadata } from "next";
import { Suspense } from "react";
import { ConversationsList } from "./conversations-list";

export const metadata: Metadata = { title: "Messages" };

export default function ConversationsPage() {
  return (
    <Suspense>
      <ConversationsList />
    </Suspense>
  );
}
