import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Github, Twitter, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Hero() {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    // Intersection Observer for lazy loading
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
        console.log("Video In View: ", entry.isIntersecting); // Debugging
      },
      { threshold: 0.1 }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isInView && videoRef.current) {
      console.log("Loading video source"); // Debugging
      videoRef.current.src = "https://media.istockphoto.com/id/1459585081/video/digital-abstract-network-grid-over-the-earth-artificial-intelligence-neural-network-growing.mp4?s=mp4-640x640-is&k=20&c=-vKDwYFF-onrZVZJR9hdA1V89xkq1pqG6qbKL0s9quo=";
      videoRef.current.load();
    }
  }, [isInView]);

  const handleVideoLoadedData = () => {
    console.log("Video loaded successfully"); // Debugging
    setIsVideoLoaded(true);
  };

  const handleVideoError = () => {
    console.error("Error loading video");
  };

  return (
    <section className="min-h-[calc(100vh-4rem)] flex items-center py-20">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold mb-4">
            Hi, I'm Clyde Tadiwa
            <span className="text-primary">.</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            A passionate software engineer focused on building innovative technology solutions 
            that make a difference.
          </p>
          <div className="flex gap-4">
            <Link href="/blog/about-me-clyde-tadiwa">
              <Button>About Me</Button>
            </Link>
            <Link href="/projects">
              <Button variant="outline">View projects</Button>
            </Link>
          </div>
          <div className="flex gap-4 mt-8">
            <a href="https://github.com/taa217" target="_blank" rel="noopener noreferrer">
              <Github className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
            </a>
            <a href="https://x.com/tadiwaclyde" target="_blank" rel="noopener noreferrer">
              <Twitter className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
            </a>
            <a href="https://www.linkedin.com/in/clyde-tadiwa-b52937227" target="_blank" rel="noopener noreferrer">
              <Linkedin className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative aspect-video rounded-2xl overflow-hidden bg-gray-100"
        >
          {!isVideoLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            onLoadedData={handleVideoLoadedData}
            onError={handleVideoError}
            className={`w-full h-full object-cover ${
              isVideoLoaded ? "opacity-100" : "opacity-0"
            } transition-opacity duration-300`}
            poster="/assets/hero-video-poster.webp"
            preload="metadata"
          >
            <source
              src="/assets/deepmimd.mp4"
              type="video/mp4"
            />
          </video>
          
          {/* Optimized gradient overlay */}
          <div 
            className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent"
            style={{ willChange: 'opacity' }}
          />
          
          {/* Optimized floating badge */}
          <div 
            className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full transform-gpu"
          >
            <span className="text-sm font-medium">Building the future</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}