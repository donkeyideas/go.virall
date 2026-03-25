import { redirect } from "next/navigation";

export default function CompetitorsPage() {
  redirect("/dashboard/intelligence?tab=competitors");
}
