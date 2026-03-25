import { requireAdmin, getAllSocialPosts } from "@/lib/dal/admin";
import { SocialPostsClient } from "./social-posts-client";

export default async function AdminSocialPostsPage() {
  await requireAdmin();
  const posts = await getAllSocialPosts();
  return <SocialPostsClient posts={posts} />;
}
