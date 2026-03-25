import { requireAdmin, getAdminNotifications } from "@/lib/dal/admin";
import { NotificationsClient } from "./notifications-client";

export default async function AdminNotificationsPage() {
  await requireAdmin();
  const notifications = await getAdminNotifications(50);
  return <NotificationsClient notifications={notifications} />;
}
