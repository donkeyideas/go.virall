import { redirect } from "next/navigation";

export default function IntelligencePage() {
  redirect("/dashboard/analytics?tab=intelligence");
}
