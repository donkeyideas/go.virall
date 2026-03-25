import { redirect } from "next/navigation";

export default function NetworkPage() {
  redirect("/dashboard/intelligence?tab=network");
}
