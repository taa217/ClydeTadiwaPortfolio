import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Github } from "lucide-react";
import type { Project } from "@shared/schema";
import { useSpring, animated } from "@react-spring/web";

export default function ProjectCard({ project }: { project: Project }) {
  const [spring, api] = useSpring(() => ({
    scale: 1,
    y: 0,
    config: { tension: 300, friction: 10 },
  }));

	const primaryUrl = project.liveUrl || project.githubUrl;
	const isClickable = Boolean(primaryUrl);

  return (
    <animated.div
      style={spring}
      onMouseEnter={() => api.start({ scale: 1.02, y: -5 })}
      onMouseLeave={() => api.start({ scale: 1, y: 0 })}
    >
		<Card className="overflow-hidden group backdrop-blur-sm bg-card/95 border-primary/10">
			<div
				className={`relative aspect-video overflow-hidden ${isClickable ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2' : ''}`}
				role={isClickable ? 'link' : undefined}
				tabIndex={isClickable ? 0 : undefined}
				aria-label={isClickable ? `Open ${project.title}` : undefined}
				onClick={() => {
					if (primaryUrl) window.open(primaryUrl, '_blank', 'noopener,noreferrer');
				}}
				onKeyDown={(e) => {
					if (!primaryUrl) return;
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						window.open(primaryUrl, '_blank', 'noopener,noreferrer');
					}
				}}
			>
          <img
            src={project.imageUrl}
            alt={project.title}
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute bottom-4 right-4 flex gap-3 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/90 hover:bg-white p-2 rounded-full transition-colors"
              >
                <ExternalLink className="w-5 h-5 text-black" />
              </a>
            )}
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/90 hover:bg-white p-2 rounded-full transition-colors"
              >
                <Github className="w-5 h-5 text-black" />
              </a>
            )}
          </div>
        </div>
        <CardHeader>
          <CardTitle className="text-2xl">{project.title}</CardTitle>
          <CardDescription className="line-clamp-2">{project.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {project.technologies.map((tech) => (
              <Badge 
                key={tech} 
                variant="secondary"
                className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                {tech}
              </Badge>
            ))}
          </div>
        </CardContent>
			<CardFooter className="flex-wrap gap-3">
				<div className="ml-auto flex gap-3">
					{project.liveUrl && (
						<Button asChild>
							<a href={project.liveUrl} target="_blank" rel="noopener noreferrer" aria-label={`View ${project.title} live`}>
								<ExternalLink />
								<span>View Project</span>
							</a>
						</Button>
					)}
					{project.githubUrl && (
						<Button asChild variant="outline">
							<a href={project.githubUrl} target="_blank" rel="noopener noreferrer" aria-label={`View ${project.title} code on GitHub`}>
								<Github />
								<span>View Code</span>
							</a>
						</Button>
					)}
				</div>
			</CardFooter>
      </Card>
    </animated.div>
  );
}
