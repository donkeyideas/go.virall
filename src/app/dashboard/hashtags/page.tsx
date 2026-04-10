import { redirect } from "next/navigation";

export default function HashtagsPage() {
  redirect("/dashboard/content?tab=hashtags");
}
