import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { DbStorage } from "./storage";
import { loginSchema, insertBlogPostSchema, type LoginCredentials, insertProjectSchema, type InsertProject } from "@shared/schema";
import session from "express-session";
import { z } from "zod";
import { notifyNewBlogPost, notifyNewProject } from "./notifications";
import express from 'express';

declare module "express-session" {
  interface SessionData {
    adminId?: number;
  }
}

// Middleware to check if user is authenticated
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.adminId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

const subscribeSchema = z.object({
  email: z.string().email()
});

const router = express.Router();
const storage = new DbStorage();

// Verify the storage instance
console.log('Router storage methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(storage)));

router.get('/posts/:slug', async (req, res) => {
  try {
    const post = await storage.getPostBySlug(req.params.slug);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json(post);
  } catch (error) {
    console.error('Error fetching post by slug:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up session middleware
 app.use(
    session({
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    })
  );
  // Project routes
  app.get("/api/projects", async (_req, res) => {
    const projects = await storage.getProjects();
    res.json(projects);
  });

  app.get("/api/projects/:id", async (req, res) => {
    const project = await storage.getProject(Number(req.params.id));
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.json(project);
  });

  // Blog post routes
  app.get("/api/posts", async (_req, res) => {
    const posts = await storage.getPosts();
    // Only return published posts for public viewing
    const publishedPosts = posts.filter(post => !post.isDraft);
    res.json(publishedPosts);
  });

  app.get("/api/posts/:slug", async (req, res) => {
    const post = await storage.getPostBySlug(req.params.slug);
    if (!post || post.isDraft) {
      return res.status(404).json({ message: "Blog post not found" });
    }
    res.json(post);
  });

  // Admin routes
  app.get("/api/admin/auth-check", (req, res) => {
    if (req.session.adminId) {
      return res.status(200).json({ authenticated: true });
    } else {
      return res.status(401).json({ authenticated: false });
    }
  });

  app.post("/api/admin/login", async (req, res) => {
    try {
      console.log('Login attempt:', req.body); // Debug log
      const credentials = loginSchema.parse(req.body);
      
      // Hardcoded credentials check
      if (credentials.username === process.env.ADMIN_USERNAME && credentials.password === process.env.ADMIN_PASSWORD) {
        req.session.adminId = 1; // Set admin ID in session
        return res.json({ message: "Logged in successfully" });
      }
      
      return res.status(401).json({ message: "Invalid credentials" });
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out successfully" });
    });
  });

  // Protected admin routes
  app.get("/api/admin/posts", requireAuth, async (_req, res) => {
    // Admin can see all posts including drafts
    const posts = await storage.getPosts();
    res.json(posts);
  });

  app.post("/api/posts", requireAuth, async (req, res) => {
    try {
      const postData = insertBlogPostSchema.parse(req.body);
      const post = await storage.createPost(postData);
      res.status(201).json(post);

      // Notify subscribers about the new blog post
      await notifyNewBlogPost(post.id);

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid post data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/posts/:id", requireAuth, async (req, res) => {
    try {
      const post = await storage.updatePost(Number(req.params.id), req.body);
      res.json(post);
    } catch (error) {
      res.status(404).json({ message: "Post not found" });
    }
  });

  app.delete("/api/posts/:id", requireAuth, async (req, res) => {
    try {
      await storage.deletePost(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ message: "Post not found" });
    }
  });

  app.post("/api/projects", requireAuth, async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.status(201).json(project);

      // Notify subscribers about the new project
      await notifyNewProject(project.id);

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteProject(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ message: "Project not found" });
    }
  });

  app.post("/api/subscribe", async (req, res) => {
    try {
      const { email } = subscribeSchema.parse(req.body);
      await storage.addSubscriber(email);
      res.status(200).json({ message: "Subscribed successfully!" });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid email format", errors: error.errors });
      }
      if (error.message === 'Email already subscribed') {
        return res.status(409).json({ message: error.message });
      }
      console.error("Subscription error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // THIS IS THE MODIFIED PART - Create HTTP server conditionally
 if (process.env.NODE_ENV !== 'production') {
    return createServer(app);
  }
  
  // Just return the app for Vercel
  return app;
}
}
