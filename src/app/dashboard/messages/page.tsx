import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ thread?: string }>;
}

export default async function MessagesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const thread = params.thread;
  redirect(thread ? `/dashboard/inbox?thread=${thread}` : "/dashboard/inbox");
}
