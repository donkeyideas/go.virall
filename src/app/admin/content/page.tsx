import { requireAdmin, getAllSiteContent } from "@/lib/dal/admin";
import { ContentClient } from "./content-client";

export default async function AdminContentPage() {
  await requireAdmin();
  const content = await getAllSiteContent();
  return <ContentClient content={content} />;
}
