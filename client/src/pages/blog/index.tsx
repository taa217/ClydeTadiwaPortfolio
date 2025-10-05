import BlogCard from "@/components/blog-card";
import { useQuery } from "@tanstack/react-query";
import type { BlogPost } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Helmet } from "react-helmet-async";
import { site, absoluteUrl, buildJsonLdWebPage, buildJsonLdBreadcrumb, buildJsonLdBlogItemList } from "@/lib/seo";

const BlogCardSkeleton = () => (
  <div className="w-full">
    <div className="relative aspect-[2/1] overflow-hidden w-full rounded-md bg-secondary animate-pulse mb-4" />
    <Skeleton className="h-5 w-3/4 mb-2" />
    <Skeleton className="h-4 w-5/6 mb-2" />
    <Skeleton className="h-4 w-1/2" />
  </div>
);

export default function BlogIndex() {
  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/posts"],
  });

  return (
    <div className="py-12">
      <Helmet>
        <title>{`Thoughts · ${site.name}`}</title>
        <meta name="description" content={`Blog posts by ${site.name}`} />
        <link rel="canonical" href={absoluteUrl('/blog')} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`Thoughts · ${site.name}`} />
        <meta property="og:description" content={`Blog posts by ${site.name}`} />
        <meta property="og:image" content={absoluteUrl(site.defaultImage)} />
        <meta property="og:url" content={absoluteUrl('/blog')} />
        <meta property="og:site_name" content={site.name} />
        <meta property="og:image:alt" content={`Blog preview image for ${site.name}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="author" content={site.name} />
        {site.twitter && <meta name="twitter:site" content={`@${site.twitter}`} />}
        <script type="application/ld+json">{JSON.stringify(buildJsonLdWebPage({
          title: `Thoughts · ${site.name}`,
          description: `Blog posts by ${site.name}`,
          url: '/blog',
          image: site.defaultImage
        }))}</script>
        <script type="application/ld+json">{JSON.stringify(buildJsonLdBreadcrumb([
          { name: 'Home', url: '/' },
          { name: 'Blog', url: '/blog' },
        ]))}</script>
        {Array.isArray(posts) && posts.length > 0 && (
          <script type="application/ld+json">{JSON.stringify(buildJsonLdBlogItemList(
            posts.map(p => ({ title: p.title, slug: p.slug }))
          ))}</script>
        )}
      </Helmet>
      <h1 className="text-4xl font-bold mb-8">My Thoughts</h1>
      <div className="grid md:grid-cols-2 gap-8">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i}>
              <BlogCardSkeleton />
            </div>
          ))
        ) : (
          posts?.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))
        )}
      </div>
    </div>
  );
}
