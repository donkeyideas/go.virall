import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTrustScore, getTrustScoreHistory } from "@/lib/dal/trust";
import { TrustScorePage } from "@/components/dashboard/TrustScorePage";

export const dynamic = "force-dynamic";

export default async function BrandTrustScorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [trustScore, history] = await Promise.all([
    getTrustScore(user.id),
    getTrustScoreHistory(user.id),
  ]);

  return (
    <TrustScorePage
      trustScore={trustScore}
      history={history}
      basePath="/brand"
    />
  );
}
