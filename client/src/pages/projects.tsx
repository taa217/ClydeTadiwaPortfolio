import ProjectCard from "@/components/project-card";
import { useQuery } from "@tanstack/react-query";
import type { Project } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Helmet } from "react-helmet-async";
import { site, absoluteUrl } from "@/lib/seo";

const ProjectCardSkeleton = () => (
  <div className="aspect-video w-full rounded-md bg-secondary animate-pulse" />
);

export default function Projects() {
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  return (
    <div className="py-12">
      <Helmet>
        <title>{`Projects · ${site.name}`}</title>
        <meta name="description" content={`Projects by ${site.name}`} />
        <link rel="canonical" href={absoluteUrl('/projects')} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`Projects · ${site.name}`} />
        <meta property="og:description" content={`Projects by ${site.name}`} />
        <meta property="og:image" content={absoluteUrl(site.defaultImage)} />
        <meta property="og:url" content={absoluteUrl('/projects')} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      <h1 className="text-4xl font-bold mb-8">Projects</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <ProjectCardSkeleton />
            </div>
          ))
        ) : (
          projects?.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))
        )}
      </div>
    </div>
  );
}
