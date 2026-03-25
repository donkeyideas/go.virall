import { requireAdmin, getAllPosts } from "@/lib/dal/admin";
import { BlogClient } from "./blog-client";

export default async function AdminBlogPage() {
  await requireAdmin();
  const posts = await getAllPosts("blog");
  return <BlogClient posts={posts} />;
}
