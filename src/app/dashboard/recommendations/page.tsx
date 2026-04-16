import { redirect } from "next/navigation";

export default function RecommendationsPage() {
  redirect("/dashboard/analytics?tab=recommendations");
}
