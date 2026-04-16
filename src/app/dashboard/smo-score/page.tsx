import { redirect } from "next/navigation";

export default function SmoScorePage() {
  redirect("/dashboard/analytics?tab=smo-score");
}
