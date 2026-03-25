import { requireAdmin, getAllRoadmap } from "@/lib/dal/admin";
import { RoadmapClient } from "./roadmap-client";

export default async function AdminRoadmapPage() {
  await requireAdmin();
  const items = await getAllRoadmap();
  return <RoadmapClient items={items} />;
}
