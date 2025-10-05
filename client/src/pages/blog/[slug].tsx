import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import type { BlogPost } from "@shared/schema";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Helmet } from "react-helmet-async";
import { absoluteUrl, buildJsonLdBlogPosting, site, buildJsonLdBreadcrumb } from "@/lib/seo";

const BlogPostSkeleton = () => (
  <div className="max-w-none">
    <div className="max-w-4xl mx-auto mb-16">
      <Skeleton className="h-12 w-3/4 mb-4" />
      <div className="flex items-center gap-4 mb-8">
        <Skeleton className="h-5 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
      <Skeleton className="w-full aspect-video rounded-lg mb-8" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>

    {/* Related Posts Skeleton */}
    <motion.section className="mt-24 mb-16 relative">
      <div className="max-w-4xl mx-auto mb-8">
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="max-w-5xl mx-auto">
        <div className="flex gap-6 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-none w-[85%] sm:w-[60%]">
              <div className="relative aspect-[16/9] rounded-xl overflow-hidden mb-4">
                <Skeleton className="absolute inset-0" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  </div>
);

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data: post, isLoading: isLoadingPost } = useQuery<BlogPost>({
    queryKey: ["/api/posts", slug],
    queryFn: async () => {
      const response = await fetch(`/api/posts/${slug}`);
      if (!response.ok) {
        throw new Error("Failed to fetch post");
      }
      return response.json();
    },
    enabled: !!slug,
  });

  const { data: allPosts, isLoading: isLoadingRelated } = useQuery<BlogPost[]>({
    queryKey: ["/api/posts"],
  });

  const relatedPosts = allPosts?.filter(p => p.slug !== slug) || [];

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const cardWidth = container.clientWidth * 0.6;
    const newScroll = direction === 'left' 
      ? container.scrollLeft - cardWidth
      : container.scrollLeft + cardWidth;
    
    container.scrollTo({
      left: newScroll,
      behavior: 'smooth'
    });

    const newSlide = direction === 'left' 
      ? Math.max(0, currentSlide - 1)
      : Math.min(relatedPosts.length - 1, currentSlide + 1);
    setCurrentSlide(newSlide);
  };

  if (isLoadingPost || isLoadingRelated) {
    return <BlogPostSkeleton />;
  }

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold text-muted-foreground">Post not found</h1>
      </div>
    );
  }

  const formattedDate = post.publishedAt ? format(new Date(post.publishedAt), "MMMM d, yyyy") : "";

  return (
    <div className="max-w-none" itemScope itemType="http://schema.org/Article">
      <Helmet>
        <title>{`${post.title} · ${site.name}`}</title>
        <meta name="description" content={post.excerpt} />
        <link rel="canonical" href={absoluteUrl(`/blog/${post.slug}`)} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:image" content={absoluteUrl(post.coverImage || site.defaultImage)} />
        <meta property="og:url" content={absoluteUrl(`/blog/${post.slug}`)} />
        <meta property="og:site_name" content={site.name} />
        <meta property="og:image:alt" content={post.title} />
        <meta property="article:published_time" content={post.publishedAt} />
        <meta property="article:author" content={site.name} />
        <meta name="author" content={site.name} />
        <meta name="twitter:card" content="summary_large_image" />
        {site.twitter && <meta name="twitter:site" content={`@${site.twitter}`} />}
        {post.tags?.length ? <meta name="keywords" content={post.tags.join(', ')} /> : null}
        {post.tags?.map(tag => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
        <script type="application/ld+json">{JSON.stringify(buildJsonLdBlogPosting({
          title: post.title,
          slug: post.slug,
          description: post.excerpt,
          image: post.coverImage,
          author: site.name,
          datePublished: post.publishedAt,
          keywords: post.tags,
        }))}</script>
        <script type="application/ld+json">{JSON.stringify(buildJsonLdBreadcrumb([
          { name: 'Home', url: '/' },
          { name: 'Blog', url: '/blog' },
          { name: post.title, url: `/blog/${post.slug}` },
        ]))}</script>
      </Helmet>
      <div className="max-w-4xl mx-auto mb-16">
        <meta itemProp="author" content="Clyde Tadiwa" />
        <h1 className="text-4xl font-bold mb-4" itemProp="headline">{post.title}</h1>

        <div className="flex items-center gap-2 text-muted-foreground mb-4" itemProp="author" itemScope itemType="http://schema.org/Person">
          <div className="rounded-full overflow-hidden w-8 h-8 relative">
            <img
              src="/assets/ceo1.jpg"
              alt="Clyde Tadiwa"
              className="object-cover w-full h-full"
            />
          </div>
          <div>
            <span className="block text-sm font-medium" itemProp="name">Clyde Tadiwa</span>
            <div className="text-xs">
              <span itemProp="jobTitle">Artificial Intelligence and Machine Learning</span>,
              <span itemProp="affiliation">University of Zimbabwe</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
          <time dateTime={post.publishedAt} itemProp="datePublished">
            {formattedDate}
          </time>
          <div className="flex gap-2">
            {post.tags.map((tag) => (
              <Badge key={tag} itemProp="keywords">{tag}</Badge>
            ))}
          </div>
        </div>
        <img
          src={post.coverImage || 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1200&h=600&fit=crop&crop=center'}
          alt={post.title}
          className="w-full aspect-video object-cover rounded-lg mb-8"
          itemProp="image"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1200&h=600&fit=crop&crop=center') {
              target.src = 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1200&h=600&fit=crop&crop=center';
            }
          }}
          loading="lazy"
        />
        <div 
          className="prose prose-lg prose-slate max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
          itemProp="articleBody"
        />
      </div>

      {relatedPosts.length > 0 && (
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-24 mb-16 relative"
        >
          <div className="max-w-4xl mx-auto mb-8">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Continue Reading
            </h2>
          </div>

          <div className="max-w-5xl mx-auto relative">
            {/* Navigation buttons - hidden on mobile, shown on sides for desktop */}
            <div className="hidden md:block">
              <div className="absolute -left-12 top-1/2 -translate-y-1/2 z-20">
                <Button
                  variant="default" // Changed to default variant for more visibility
                  size="icon"
                  className={cn(
                    "bg-primary hover:bg-primary/90",
                    "shadow-lg",
                    currentSlide === 0 && "opacity-50 cursor-not-allowed",
                    "w-10 h-10"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleScroll('left');
                  }}
                  disabled={currentSlide === 0}
                >
                  <ChevronLeft className="h-6 w-6 text-primary-foreground" />
                </Button>
              </div>

              <div className="absolute -right-12 top-1/2 -translate-y-1/2 z-20">
                <Button
                  variant="default"
                  size="icon"
                  className={cn(
                    "bg-primary hover:bg-primary/90",
                    "shadow-lg",
                    currentSlide === relatedPosts.length - 1 && "opacity-50 cursor-not-allowed",
                    "w-10 h-10"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleScroll('right');
                  }}
                  disabled={currentSlide === relatedPosts.length - 1}
                >
                  <ChevronRight className="h-6 w-6 text-primary-foreground" />
                </Button>
              </div>
            </div>

            {/* Carousel container */}
            <div
              ref={scrollContainerRef}
              className="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4"
            >
              {relatedPosts.map((relatedPost, index) => (
                <motion.a
                  key={relatedPost.id}
                  href={`/blog/${relatedPost.slug}`}
                  className={cn(
                    "relative flex-none w-[85%] sm:w-[60%] snap-center group",
                    "transform transition-all duration-300 hover:scale-[1.02]"
                  )}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="relative aspect-[16/9] rounded-xl overflow-hidden mb-4">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                    <img
                      src={relatedPost.coverImage || 'https://source.unsplash.com/random'}
                      alt={relatedPost.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-6 z-20 text-white">
                      <h3 className="text-xl font-bold mb-2 line-clamp-2">
                        {relatedPost.title}
                      </h3>
                      <p className="text-sm text-white/80 line-clamp-2">
                        {relatedPost.excerpt}
                      </p>
                      <div className="flex items-center gap-3 mt-4 text-sm text-white/60">
                        <time dateTime={relatedPost.publishedAt}>
                          {format(new Date(relatedPost.publishedAt), "MMMM d, yyyy")}
                        </time>
                        <span>•</span>
                        <span>{relatedPost.readingTime} min read</span>
                      </div>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>

            {/* Mobile navigation buttons - shown at bottom on mobile only */}
            <div className="md:hidden flex justify-center gap-4 mt-6 mb-2">
              <Button
                variant="default"
                size="icon"
                className={cn(
                  "bg-primary hover:bg-primary/90",
                  "shadow-lg",
                  currentSlide === 0 && "opacity-50 cursor-not-allowed",
                  "w-12 h-12 rounded-full" // Larger, rounded buttons for mobile
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  handleScroll('left');
                }}
                disabled={currentSlide === 0}
              >
                <ChevronLeft className="h-6 w-6 text-primary-foreground" />
              </Button>

              <Button
                variant="default"
                size="icon"
                className={cn(
                  "bg-primary hover:bg-primary/90",
                  "shadow-lg",
                  currentSlide === relatedPosts.length - 1 && "opacity-50 cursor-not-allowed",
                  "w-12 h-12 rounded-full" // Larger, rounded buttons for mobile
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  handleScroll('right');
                }}
                disabled={currentSlide === relatedPosts.length - 1}
              >
                <ChevronRight className="h-6 w-6 text-primary-foreground" />
              </Button>
            </div>
          </div>

          {/* Progress dots - moved below mobile buttons */}
          <div className="flex justify-center gap-2 mt-6">
            {relatedPosts.map((_, index) => (
              <button
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  currentSlide === index 
                    ? "bg-primary w-6" 
                    : "bg-primary/20 hover:bg-primary/40"
                )}
                onClick={() => {
                  if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTo({
                      left: index * scrollContainerRef.current.clientWidth * 0.6,
                      behavior: 'smooth'
                    });
                    setCurrentSlide(index);
                  }
                }}
              />
            ))}
          </div>
        </motion.section>
      )}
    </div>
  );
}