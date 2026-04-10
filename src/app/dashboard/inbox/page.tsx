import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getConversations } from "@/lib/dal/chat";
import { getSocialProfiles } from "@/lib/dal/profiles";
import { getUserApiKeys } from "@/lib/actions/api-keys";
import { getThreadsForUser } from "@/lib/dal/messages";
import { getMessages } from "@/lib/actions/messages";
import { InboxHubClient } from "./InboxHubClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ thread?: string }>;
}

export default async function InboxPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;

  // Fetch both chat and messages data in parallel
  const [conversations, profiles, apiKeys, threads] = await Promise.all([
    getConversations(),
    getSocialProfiles(),
    getUserApiKeys(),
    getThreadsForUser(),
  ]);

  const activeProvider = apiKeys.find((k) => k.is_active);

  // If a specific thread is requested, pre-load its messages
  let initialMessages;
  const initialThreadId = params.thread;
  if (initialThreadId) {
    initialMessages = await getMessages(initialThreadId);
  }

  return (
    <Suspense>
      <InboxHubClient
        currentUserId={user.id}
        initialConversations={conversations}
        profiles={profiles}
        activeProvider={activeProvider?.provider ?? null}
        threads={threads}
        initialThreadId={initialThreadId}
        initialMessages={initialMessages}
      />
    </Suspense>
  );
}
