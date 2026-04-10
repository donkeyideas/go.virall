import { redirect } from "next/navigation";

export default function RevenuePage() {
  redirect("/dashboard/business?tab=revenue");
}
