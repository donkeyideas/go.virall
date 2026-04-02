"use server";

import { createClient } from "@/lib/supabase/server";
import type { ChatConversation, ChatMessage } from "@/types";

export async function getConversations(limit = 50): Promise<ChatConversation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_conversations")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as ChatConversation[];
}

export async function getConversation(id: string): Promise<ChatConversation | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_conversations")
    .select("*")
    .eq("id", id)
    .single();

  return data as ChatConversation | null;
}

export async function getMessages(
  conversationId: string,
  limit = 100,
): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  return (data ?? []) as ChatMessage[];
}

export async function getRecentMessages(
  conversationId: string,
  limit = 20,
): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  // Return in chronological order
  return ((data ?? []) as ChatMessage[]).reverse();
}
