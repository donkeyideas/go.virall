import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BrandShell } from "@/components/brand/BrandShell";
import { getUnreadCount, getNotifications } from "@/lib/dal/notifications";
import { getUnreadSupportReplyCount } from "@/lib/dal/support";

export default async function BrandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile and check account_type
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, account_type, company_name, brand_logo_url")
    .eq("id", user.id)
    .single();

  // If user is not a brand account, redirect to creator dashboard
  if (!profile || profile.account_type !== "brand") {
    redirect("/dashboard");
  }

  const [unreadCount, notifications, unreadSupportCount] = await Promise.all([
    getUnreadCount(),
    getNotifications(10),
    getUnreadSupportReplyCount(user.id),
  ]);

  return (
    <BrandShell
      userName={profile.full_name ?? null}
      companyName={profile.company_name ?? null}
      companyLogoUrl={profile.brand_logo_url ?? null}
      showLogout
      unreadCount={unreadCount}
      unreadSupportCount={unreadSupportCount}
      notifications={notifications}
    >
      {children}
    </BrandShell>
  );
}
