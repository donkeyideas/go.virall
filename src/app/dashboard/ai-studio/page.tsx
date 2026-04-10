import { redirect } from "next/navigation";

export default function AiStudioPage() {
  redirect("/dashboard/content?tab=ai-studio");
}
