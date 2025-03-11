import BlogCard from "@/components/blog-card";
import { useQuery } from "@tanstack/react-query";
import type { BlogPost } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

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
      <h1 className="text-4xl font-bold mb-8">Blogs</h1>
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
