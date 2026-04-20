import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTrustScore, getTrustScoreHistory } from "@/lib/dal/trust";
import { TrustScorePage } from "@/components/dashboard/TrustScorePage";

export const dynamic = "force-dynamic";

export default async function DashboardTrustScorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [trustScore, trustHistory] = await Promise.all([
    getTrustScore(user.id),
    getTrustScoreHistory(user.id),
  ]);

  return (
    <Suspense>
      <TrustScorePage
        trustScore={trustScore ?? null}
        history={trustHistory ?? []}
        basePath="/dashboard"
      />
    </Suspense>
  );
}
