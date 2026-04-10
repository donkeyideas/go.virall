import { redirect } from "next/navigation";

export default function ProposalsPage() {
  redirect("/dashboard/business?tab=proposals");
}
