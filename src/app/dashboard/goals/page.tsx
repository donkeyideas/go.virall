import { getSocialProfiles } from "@/lib/dal/profiles";
import { GoalsClient } from "@/components/dashboard/goals/GoalsClient";

export default async function GoalsPage() {
  const profiles = await getSocialProfiles();
  return <GoalsClient profiles={profiles} />;
}
