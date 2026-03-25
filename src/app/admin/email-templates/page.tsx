import { requireAdmin, getAllEmailTemplates } from "@/lib/dal/admin";
import { EmailTemplatesClient } from "./email-templates-client";

export default async function AdminEmailTemplatesPage() {
  await requireAdmin();
  const templates = await getAllEmailTemplates();
  return <EmailTemplatesClient templates={templates} />;
}
