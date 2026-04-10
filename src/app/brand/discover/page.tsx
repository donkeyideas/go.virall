import { getFeaturedCreators } from "@/lib/dal/marketplace";
import DiscoverClient from "./DiscoverClient";

export const metadata = {
  title: "Discover Creators | Go Virall",
  description: "Find the perfect creators for your brand campaigns with advanced search and filters.",
};

export default async function DiscoverPage() {
  const featuredCreators = await getFeaturedCreators(20);

  return (
    <DiscoverClient
      initialCreators={featuredCreators}
      initialTotal={featuredCreators.length}
    />
  );
}
