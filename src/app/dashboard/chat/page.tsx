import { Suspense } from "react";
import { getConversations } from "@/lib/dal/chat";
import { getSocialProfiles } from "@/lib/dal/profiles";
import { getUserApiKeys } from "@/lib/actions/api-keys";
import { ChatClient } from "./ChatClient";

export default async function ChatPage() {
  const [conversations, profiles, apiKeys] = await Promise.all([
    getConversations(),
    getSocialProfiles(),
    getUserApiKeys(),
  ]);

  const activeProvider = apiKeys.find((k) => k.is_active);

  return (
    <Suspense>
      <ChatClient
        initialConversations={conversations}
        profiles={profiles}
        activeProvider={activeProvider?.provider ?? null}
      />
    </Suspense>
  );
}
