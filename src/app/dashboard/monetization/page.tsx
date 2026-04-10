import { redirect } from "next/navigation";

export default function MonetizationPage() {
  redirect("/dashboard/business?tab=monetization");
}
