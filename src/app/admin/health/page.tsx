import { requireAdmin, getSystemHealth, getAPICallLog } from "@/lib/dal/admin";
import { HealthClient } from "./health-client";

export default async function AdminHealthPage() {
  await requireAdmin();
  const [health, recentErrors] = await Promise.all([
    getSystemHealth(),
    getAPICallLog(20),
  ]);
  return <HealthClient health={health} recentCalls={recentErrors} />;
}
