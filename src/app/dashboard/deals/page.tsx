import { redirect } from "next/navigation";

export default function DealsPage() {
  redirect("/dashboard/business?tab=deals");
}
