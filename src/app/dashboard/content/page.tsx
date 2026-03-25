import { redirect } from "next/navigation";

export default function ContentPage() {
  redirect("/dashboard/strategy?tab=content-strategy");
}
