import { requireAdmin, getAllChangelog } from "@/lib/dal/admin";
import { ChangelogClient } from "./changelog-client";

export default async function AdminChangelogPage() {
  await requireAdmin();
  const entries = await getAllChangelog();
  return <ChangelogClient entries={entries} />;
}
