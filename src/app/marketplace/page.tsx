import {
  getFeaturedCreators,
  getMarketplaceStats,
  getCategoryCounts,
} from "@/lib/dal/marketplace";
import MarketplaceClient from "./MarketplaceClient";

export const metadata = {
  title: "Creator Marketplace | Go Virall",
  description:
    "Discover top creators and influencers for brand collaborations. Browse by category, engagement rate, audience quality, and more on Go Virall's public creator marketplace.",
  openGraph: {
    title: "Creator Marketplace | Go Virall",
    description:
      "Discover top creators and influencers for brand collaborations. Browse by category, engagement rate, and audience quality.",
    type: "website",
  },
};

export default async function MarketplacePage() {
  const [featuredCreators, stats, categories] = await Promise.all([
    getFeaturedCreators(12),
    getMarketplaceStats(),
    getCategoryCounts(),
  ]);

  return (
    <MarketplaceClient
      featuredCreators={featuredCreators}
      stats={stats}
      categories={categories}
    />
  );
}
