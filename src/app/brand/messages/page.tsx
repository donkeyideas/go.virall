import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getThreadsForUser } from "@/lib/dal/messages";
import { getMessages } from "@/lib/actions/messages";
import { BrandMessagesClient } from "./BrandMessagesClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ thread?: string; to?: string }>;
}

export default async function BrandMessagesPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const threads = await getThreadsForUser();

  let initialMessages;
  const initialThreadId = params.thread;
  if (initialThreadId) {
    initialMessages = await getMessages(initialThreadId);
  }

  return (
    <Suspense>
      <BrandMessagesClient
        threads={threads}
        currentUserId={user.id}
        initialThreadId={initialThreadId}
        initialMessages={initialMessages}
        autoMessageUserId={params.to}
      />
    </Suspense>
  );
}
