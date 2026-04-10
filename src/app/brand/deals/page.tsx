import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDeals } from "@/lib/actions/deals";
import { BrandDealsClient } from "./BrandDealsClient";

export const dynamic = "force-dynamic";

export default async function BrandDealsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const result = await getDeals();

  return <BrandDealsClient deals={result.data ?? []} currentUserId={user.id} />;
}
