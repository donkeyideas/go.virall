import { redirect } from "next/navigation";

export default function DashboardTrustScorePage() {
  redirect("/dashboard/analytics?tab=trust-score");
}
