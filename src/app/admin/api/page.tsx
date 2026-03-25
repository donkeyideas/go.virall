import {
  requireAdmin,
  getAPIConfigs,
  getAPIUsageStats,
  getAPICallLog,
} from "@/lib/dal/admin";
import { APIClient } from "./api-client";

export default async function AdminAPIPage() {
  await requireAdmin();
  const [configs, usage, callLog] = await Promise.all([
    getAPIConfigs(),
    getAPIUsageStats(30),
    getAPICallLog(20),
  ]);
  return <APIClient configs={configs} usage={usage} callLog={callLog} />;
}
