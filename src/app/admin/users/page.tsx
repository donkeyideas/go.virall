import { requireAdmin, getAllUsers } from "@/lib/dal/admin";
import { UsersClient } from "./users-client";

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await getAllUsers();

  return <UsersClient users={users} />;
}
