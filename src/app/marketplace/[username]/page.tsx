import { notFound } from "next/navigation";
import { getCreatorByUsername } from "@/lib/dal/marketplace";
import CreatorPublicPage from "./CreatorPublicPage";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const creator = await getCreatorByUsername(username);

  if (!creator) {
    return { title: "Creator Not Found | Go Virall" };
  }

  const name = creator.profile?.full_name ?? "Creator";
  const niche = creator.profile?.niche ?? "";
  const description = creator.profile?.bio
    ? creator.profile.bio.slice(0, 160)
    : `${name} — ${niche} creator on Go Virall. View their profile, stats, and collaboration rates.`;

  return {
    title: `${name} — ${niche} Creator | Go Virall Marketplace`,
    description,
    openGraph: {
      title: `${name} — ${niche} Creator`,
      description,
      type: "profile",
      images: creator.profile?.avatar_url
        ? [{ url: creator.profile.avatar_url, width: 200, height: 200 }]
        : undefined,
    },
  };
}

export default async function CreatorProfilePage({ params }: PageProps) {
  const { username } = await params;
  const creator = await getCreatorByUsername(username);

  if (!creator) {
    notFound();
  }

  return <CreatorPublicPage creator={creator} />;
}
