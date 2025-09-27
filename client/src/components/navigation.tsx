import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const routes = [
  { path: "/", label: "Home" },
  { path: "/projects", label: "Projects" },
  { path: "/blog", label: "Thoughts" },
];

export default function Navigation() {
  const [location] = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/">
            <span className="text-xl font-bold cursor-pointer">Clyde Tadiwa</span>
          </Link>

          <div className="flex gap-8">
            {routes.map(route => (
              <Link key={route.path} href={route.path}>
                <span className={cn(
                  "text-sm font-medium transition-colors cursor-pointer",
                  location === route.path ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}>
                  {route.label}
                  {location === route.path && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute -bottom-[1px] left-0 right-0 h-0.5 bg-primary"
                      initial={false}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}