import { requireAdmin, getAllJobs } from "@/lib/dal/admin";
import { CareersClient } from "./careers-client";

export default async function AdminCareersPage() {
  await requireAdmin();
  const jobs = await getAllJobs();
  return <CareersClient jobs={jobs} />;
}
