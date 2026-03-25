import { requireAdmin, getAllContacts, getUnreadContactCount } from "@/lib/dal/admin";
import { ContactsClient } from "./contacts-client";

export default async function AdminContactsPage() {
  await requireAdmin();
  const [contacts, unreadCount] = await Promise.all([
    getAllContacts(),
    getUnreadContactCount(),
  ]);
  return <ContactsClient contacts={contacts} unreadCount={unreadCount} />;
}
