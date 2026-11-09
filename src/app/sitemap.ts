import type { MetadataRoute } from "next";
import { getSite } from "@/lib/store";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  const { blogs } = await getSite();
  const blogEntries: MetadataRoute.Sitemap = blogs
    .filter((b) => b.published)
    .map((post) => ({
      url: `${origin}/blogs/${post.slug}`,
      lastModified: new Date(post.publishedAt),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  return [
    { url: origin, changeFrequency: "daily", priority: 1 },
    { url: `${origin}/blogs`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${origin}/cart`, changeFrequency: "weekly", priority: 0.7 },
    ...blogEntries,
  ];
}
