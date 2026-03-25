import { redirect } from "next/navigation";

export default function HashtagsPage() {
  redirect("/dashboard/strategy?tab=hashtags");
}
