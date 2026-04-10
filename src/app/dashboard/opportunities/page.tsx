import { redirect } from "next/navigation";

export default function OpportunitiesPage() {
  redirect("/dashboard/business?tab=opportunities");
}
