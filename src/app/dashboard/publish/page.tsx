import { redirect } from "next/navigation";

export default function PublishPage() {
  redirect("/dashboard/content?tab=publish");
}
