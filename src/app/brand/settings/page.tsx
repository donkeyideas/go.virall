import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BrandSettingsClient from "./BrandSettingsClient";
import { getTeamInvites } from "@/lib/actions/settings";
import { getCurrentOrganization } from "@/lib/dal/auth";
import { getSubscriptionData, getBillingInvoices } from "@/lib/dal/billing";
import { getPricingPlansByType } from "@/lib/dal/admin";
import { getBrandSupportMessages, getUnreadSupportReplyCount } from "@/lib/dal/support";

export default async function BrandSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, invites, organization, subscription, invoices, brandPlans, supportMessages, unreadSupportCount] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "full_name, company_name, company_website, industry, company_size, brand_description, brand_logo_url, contact_email, contact_phone"
        )
        .eq("id", user.id)
        .single(),
      getTeamInvites(),
      getCurrentOrganization(),
      getSubscriptionData(),
      getBillingInvoices(),
      getPricingPlansByType("brand"),
      getBrandSupportMessages(user.id),
      getUnreadSupportReplyCount(user.id),
    ]);

  // Pre-populate contact email with auth email if not set
  const contactEmail = profile?.contact_email || user.email || "";

  return (
    <BrandSettingsClient
      profile={{
        companyName: profile?.company_name ?? "",
        website: profile?.company_website ?? "",
        industry: profile?.industry ?? "",
        companySize: profile?.company_size ?? "",
        description: profile?.brand_description ?? "",
        contactEmail,
        contactPhone: profile?.contact_phone ?? "",
        logoUrl: profile?.brand_logo_url ?? null,
      }}
      initialInvites={invites}
      organization={organization}
      subscription={subscription}
      invoices={invoices}
      brandPlans={brandPlans}
      supportMessages={supportMessages}
      unreadSupportCount={unreadSupportCount}
    />
  );
}
