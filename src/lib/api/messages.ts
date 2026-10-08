import { api, apiList, apiWithMeta, fetchBlob, type Query } from "@/lib/api/client";
import type { Conversation, Message, PageMeta, Review } from "@/types/api";

// Product reviews (DECISIONS RV1): products.view lists them, reviews.moderate hides or shows one.
export interface ReviewQuery extends Query {
  /** true: only hidden ones; false: only visible ones; leave out for both. */
  hidden?: boolean;
  rating?: number | "";
  store_id?: string;
  product_id?: string;
  page?: number;
  per_page?: number;
}

export const listReviews = (query: ReviewQuery) => apiList<Review>("/admin/reviews", query);
/** The reason (up to 500 characters) is what the buyer and the store see; the ratings stop counting it. */
export const hideReview = (id: string, reason: string) =>
  api<Review>(`/admin/reviews/${id}/hide`, { method: "POST", body: { reason } });
export const unhideReview = (id: string) => api<Review>(`/admin/reviews/${id}/unhide`, { method: "POST" });

// Buyer-store conversations (DECISIONS MS3): messages.view reads, messages.manage hides a message.
// Staff never write in a conversation.
export const listConversations = (query: Query & { store_id?: string; buyer_id?: string; page?: number; per_page?: number }) =>
  apiList<Conversation>("/admin/conversations", query);
export const getConversation = (id: string) => api<Conversation>(`/admin/conversations/${id}`);
/** Newest first, hidden ones in full; `before` (a message's id) pages back to older ones. */
export const listMessages = (id: string, before?: string) =>
  apiWithMeta<Message[], PageMeta>(`/admin/conversations/${id}/messages`, { query: { before, per_page: 30 } });
/** One of a message's photos (WebP), numbered from 1; it needs the bearer token, so it comes as a blob. */
export const getMessagePhoto = (conversationId: string, messageId: string, number: number, signal?: AbortSignal) =>
  fetchBlob(`/admin/conversations/${conversationId}/messages/${messageId}/photos/${number}`, signal);
/** Both sides see the reason (up to 500 characters) instead of its text and photos. */
export const hideMessage = (conversationId: string, messageId: string, reason: string) =>
  api<Message>(`/admin/conversations/${conversationId}/messages/${messageId}/hide`, { method: "POST", body: { reason } });
export const unhideMessage = (conversationId: string, messageId: string) =>
  api<Message>(`/admin/conversations/${conversationId}/messages/${messageId}/unhide`, { method: "POST" });
