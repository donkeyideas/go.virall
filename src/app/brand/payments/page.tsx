import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/dal/auth";
import { getSubscriptionData, getBillingInvoices } from "@/lib/dal/billing";
import { BrandPaymentsClient } from "./BrandPaymentsClient";

export default async function BrandPaymentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [organization, subscription, invoices, profileResult] = await Promise.all([
    getCurrentOrganization(),
    getSubscriptionData(),
    getBillingInvoices(),
    supabase
      .from("profiles")
      .select("company_name, full_name, brand_logo_url")
      .eq("id", user.id)
      .single(),
  ]);

  const profile = profileResult.data;

  return (
    <BrandPaymentsClient
      organization={organization}
      subscription={subscription}
      invoices={invoices}
      companyName={profile?.company_name || profile?.full_name || null}
      companyLogoUrl={profile?.brand_logo_url || null}
    />
  );
}
