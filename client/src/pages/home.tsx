import Hero from "@/components/hero";
import ProjectCard from "@/components/project-card";
import BlogCard from "@/components/blog-card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Project, BlogPost } from "@shared/schema";
import { useInView } from "react-intersection-observer";
import gsap from "gsap";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Helmet } from "react-helmet-async";
import { site, buildJsonLdWebsite, buildJsonLdPerson, absoluteUrl, buildJsonLdWebPage, buildJsonLdBreadcrumb } from "@/lib/seo";

// Skeleton components for loading states
const ProjectCardSkeleton = () => (
  <div className="aspect-video w-full rounded-md bg-secondary animate-pulse" />
);

const BlogCardSkeleton = () => (
  <div className="w-full">
    <div className="relative aspect-[2/1] overflow-hidden w-full rounded-md bg-secondary animate-pulse mb-4" />
    <Skeleton className="h-5 w-3/4 mb-2" />
    <Skeleton className="h-4 w-5/6 mb-2" />
    <Skeleton className="h-4 w-1/2" />
  </div>
);

export default function Home() {
  const { data: projects, isLoading: isLoadingProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: posts, isLoading: isLoadingPosts } = useQuery<BlogPost[]>({
    queryKey: ["/api/posts"],
  });

  const [postsRef, postsInView] = useInView({
    threshold: 0.2,
    triggerOnce: true,
  });

  // Stagger animation for cards
  useEffect(() => {
    if (postsInView && posts && !isLoadingPosts) {
      gsap.from(".blog-card", {
        duration: 0.8,
        y: 50,
        opacity: 0,
        stagger: 0.2,
        ease: "power3.out",
      });
    }
  }, [postsInView, posts, isLoadingPosts]);

  return (
    <div className="space-y-2 relative">
      <Helmet>
        <title>{`${site.name} · Portfolio`}</title>
        <meta name="description" content={site.description} />
        <link rel="canonical" href={absoluteUrl('/')} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${site.name} · Portfolio`} />
        <meta property="og:description" content={site.description} />
        <meta property="og:image" content={absoluteUrl(site.defaultImage)} />
        <meta property="og:url" content={absoluteUrl('/')} />
        <meta property="og:site_name" content={site.name} />
        <meta property="og:image:alt" content={`${site.name} preview image`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="author" content={site.name} />
        <meta name="twitter:title" content={`${site.name} · Portfolio`} />
        <meta name="twitter:description" content={site.description} />
        <meta name="twitter:image" content={absoluteUrl(site.defaultImage)} />
        {site.twitter && <meta name="twitter:site" content={`@${site.twitter}`} />}
        <script type="application/ld+json">{JSON.stringify(buildJsonLdWebsite())}</script>
        <script type="application/ld+json">{JSON.stringify(buildJsonLdPerson())}</script>
        <script type="application/ld+json">{JSON.stringify(buildJsonLdWebPage({
          title: `${site.name} · Portfolio`,
          description: site.description,
          url: '/',
          image: site.defaultImage
        }))}</script>
        <script type="application/ld+json">{JSON.stringify(buildJsonLdBreadcrumb([
          { name: 'Home', url: '/' },
        ]))}</script>
      </Helmet>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,rgba(var(--primary-rgb),0.1),transparent)]" />
      <Hero />
      
      <section className="relative">
        <div className="flex flex-row items-center justify-between mb-12">
          <div className="mb-4 md:mb-0">
            <h2 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Featured Projects
            </h2>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              Check out some of my recent work
            </p>
          </div>
          <Link href="/projects">
            <Button variant="outline" className="group">
              View all projects
              <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
            </Button>
          </Link>
        </div>
        <div className="grid md:grid-cols-2 gap-12">
          {isLoadingProjects
            ? Array.from({ length: 2 }).map((_, i) => (
                <div key={i}>
                  <ProjectCardSkeleton />
                </div>
              ))
            : projects?.slice(0, 2).map((project, idx) => (
                <motion.div
                  key={project.id}
                  className="project-card"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: idx * 0.1 }}
                >
                  <ProjectCard project={project} />
                </motion.div>
              ))}
        </div>
      </section>

      <section ref={postsRef} className="relative">
        <div className="flex flex-row items-center justify-between mb-12">
          <div className="mb-4 md:mb-0">
            <h2 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Latest Thoughts
            </h2>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              Thoughts, and insights
            </p>
          </div>
          <Link href="/blog">
            <Button variant="outline" className="group text-sm md:text-base">
              View all posts
              <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
            </Button>
          </Link>
        </div>
        <div className="grid md:grid-cols-2 gap-12 mb-8">
          {isLoadingPosts
            ? Array.from({ length: 2 }).map((_, i) => (
                <div key={i}>
                  <BlogCardSkeleton />
                </div>
              ))
            : posts?.slice(0, 2).map((post) => (
                <div key={post.id} className="blog-card">
                  <BlogCard post={post} />
                </div>
              ))}
        </div>
      </section>
    </div>
  );
}
