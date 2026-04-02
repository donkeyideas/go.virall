import { requireAdmin, getAllPosts } from "@/lib/dal/admin";
import { BlogClient } from "./blog-client";

export default async function AdminBlogPage() {
  await requireAdmin();
  const [blogPosts, guidePosts] = await Promise.all([
    getAllPosts("blog"),
    getAllPosts("guide"),
  ]);
  return <BlogClient blogPosts={blogPosts} guidePosts={guidePosts} />;
}
