import { motion } from "framer-motion";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import type { BlogPost } from "@shared/schema";
import { useSpring, animated } from "@react-spring/web";
import { Calendar, Clock, Tag } from "lucide-react";
import { useState } from "react";

export default function BlogCard({ post }: { post: BlogPost }) {
  const [imageSrc, setImageSrc] = useState(post.coverImage);
  const [imageError, setImageError] = useState(false);
  
  const [spring, api] = useSpring(() => ({
    scale: 1,
    y: 0,
    config: { tension: 300, friction: 10 },
  }));

  const handleImageError = () => {
    if (!imageError) {
      setImageError(true);
      // Try a fallback image first
      setImageSrc('https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&h=400&fit=crop&crop=center');
    }
  };

  return (
    <animated.div
      style={spring}
      onMouseEnter={() => api.start({ scale: 1.02, y: -5 })}
      onMouseLeave={() => api.start({ scale: 1, y: 0 })}
    >
      <Link href={`/blog/${post.slug}`}>
        <Card className="overflow-hidden group backdrop-blur-sm bg-card/95 border-primary/10 w-full">
          <div className="relative aspect-[2/1] overflow-hidden w-full">
            <img
              src={imageSrc}
              alt={post.title}
              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
              onError={handleImageError}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="text-xl font-semibold text-white group-hover:text-primary transition-colors break-words">
                {post.title}
              </h3>
            </div>
          </div>
          <CardHeader className="w-full">
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <time dateTime={post.publishedAt}>
                  {format(new Date(post.publishedAt), "MMM d, yyyy")}
                </time>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                <div className="flex gap-2">
                  {post.tags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="secondary"
                      className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground line-clamp-2">{post.excerpt}</p>
          </CardContent>
        </Card>
      </Link>
    </animated.div>
  );
}