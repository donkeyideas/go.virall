import { getAllPricingPlans, requireAdmin } from "@/lib/dal/admin";
import { SubscriptionsClient } from "./subscriptions-client";

export default async function AdminSubscriptionsPage() {
  await requireAdmin();
  const plans = await getAllPricingPlans();
  return <SubscriptionsClient plans={plans} />;
}
