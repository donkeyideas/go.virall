import { requireAdmin, getAllOrgs } from "@/lib/dal/admin";
import { OrgsClient } from "./orgs-client";

export default async function AdminOrgsPage() {
  await requireAdmin();
  const orgs = await getAllOrgs();

  return <OrgsClient orgs={orgs} />;
}
