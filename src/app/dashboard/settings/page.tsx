import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentOrganization, getCurrentUser } from "@/lib/dal/auth";
import { getSocialProfiles } from "@/lib/dal/profiles";
import { getUserPreferences } from "@/lib/dal/settings";
import { getSubscriptionData, getBillingInvoices } from "@/lib/dal/billing";
import { getMediaKitData } from "@/lib/dal/media-kit";
import { SettingsClient } from "@/components/dashboard/settings/SettingsClient";

export default async function SettingsPage() {
  const [profile, org, socialProfiles, userPrefs, user, subscription, invoices] =
    await Promise.all([
      getCurrentProfile(),
      getCurrentOrganization(),
      getSocialProfiles(),
      getUserPreferences(),
      getCurrentUser(),
      getSubscriptionData(),
      getBillingInvoices(),
    ]);

  if (!user) redirect("/login");

  const mediaKitData = await getMediaKitData(user.id);

  return (
    <SettingsClient
      profile={profile}
      organization={org}
      socialProfiles={socialProfiles}
      userPreferences={userPrefs}
      userEmail={user?.email ?? null}
      subscription={subscription}
      invoices={invoices}
      mediaKitData={mediaKitData}
    />
  );
}
