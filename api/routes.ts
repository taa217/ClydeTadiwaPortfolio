import type { Express, Request, Response, NextFunction } from "express";
// createServer is no longer needed for the return type here, but keep if used elsewhere locally
// import { createServer } from "http"; 
import { DbStorage } from "./storage.js";
import { loginSchema, insertBlogPostSchema, type LoginCredentials, insertProjectSchema, type InsertProject } from "@shared/schema.js";
import session from "express-session";
import { z } from "zod";
import { notifyNewBlogPost, notifyNewProject } from "./notifications.js";
import express from 'express';

// Augment express-session types
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

// Zod schema for subscription
const subscribeSchema = z.object({
  email: z.string().email()
});

// --- Standalone Router ---
// Note: This router seems unused based on the direct app.get/post calls below.
// If it's intended to be mounted, you'd need an app.use('/prefix', router) call.
// Leaving it here as it was in the original code.
const router = express.Router();
const storage = new DbStorage();

// Example route on the standalone router (keep or remove if unused)
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
// --- End Standalone Router ---


/**
 * Registers all API routes with the provided Express application instance.
 * IMPORTANT: Route paths defined here should NOT start with /api, 
 * as Vercel's rewrite rule handles that prefix.
 * 
 * @param app The Express application instance.
 */
export async function registerRoutes(app: Express): Promise<void> { // Corrected return type
  
  // Set up session middleware
  app.use(
    session({
      // Use environment variable for secret in production
      secret: process.env.SESSION_SECRET || 'your-development-secret-key', 
      resave: false,
      saveUninitialized: false,
      cookie: { 
        secure: process.env.NODE_ENV === 'production', // Set secure flag in production
        httpOnly: true, // Prevent client-side JS access
        sameSite: 'lax', // Good default for CSRF protection
        maxAge: 24 * 60 * 60 * 1000 // Cookie expiry: 24 hours
      }
    })
  );

  // === Public Routes ===

  // Project routes
  app.get("/projects", async (_req, res) => { // Path: /projects
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ message: 'Failed to fetch projects' });
    }
  });

  app.get("/projects/:id", async (req, res) => { // Path: /projects/:id
    try {
        const projectId = Number(req.params.id);
        if (isNaN(projectId)) {
            return res.status(400).json({ message: "Invalid project ID" });
        }
        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
        res.json(project);
    } catch (error) {
        console.error(`Error fetching project ${req.params.id}:`, error);
        res.status(500).json({ message: 'Failed to fetch project' });
    }
  });

  // Blog post routes
  app.get("/posts", async (_req, res) => { // Path: /posts
    try {
        const posts = await storage.getPosts();
        // Only return published posts for public viewing
        const publishedPosts = posts.filter(post => !post.isDraft);
        res.json(publishedPosts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: 'Failed to fetch posts' });
    }
  });

  app.get("/posts/:slug", async (req, res) => { // Path: /posts/:slug
    try {
        const post = await storage.getPostBySlug(req.params.slug);
        // Ensure post exists and is not a draft for public view
        if (!post || post.isDraft) { 
          return res.status(404).json({ message: "Blog post not found" });
        }
        res.json(post);
    } catch (error) {
        console.error(`Error fetching post by slug ${req.params.slug}:`, error);
        res.status(500).json({ message: 'Failed to fetch post' });
    }
  });

  // Subscription route
  app.post("/subscribe", async (req, res) => { // Path: /subscribe
    try {
      const { email } = subscribeSchema.parse(req.body);
      await storage.addSubscriber(email);
      res.status(200).json({ message: "Subscribed successfully!" });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid email format", errors: error.errors });
      }
      // Check for specific error message from storage layer if needed
      if (error.message === 'Email already subscribed') { 
        return res.status(409).json({ message: error.message });
      }
      console.error("Subscription error:", error);
      res.status(500).json({ message: "Subscription failed" }); // Avoid leaking specific errors
    }
  });


  // === Admin Authentication Routes ===

  app.get("/admin/auth-check", (req, res) => { // Path: /admin/auth-check
    if (req.session.adminId) {
      return res.status(200).json({ authenticated: true });
    } else {
      // Intentionally return 200 OK but indicate not authenticated
      // Or return 401 if you prefer - depends on frontend handling
      return res.status(200).json({ authenticated: false }); 
    }
  });

  app.post("/admin/login", async (req, res) => { // Path: /admin/login
    try {
      const credentials = loginSchema.parse(req.body);
      
      // Compare against environment variables
      const adminUser = process.env.ADMIN_USERNAME;
      const adminPass = process.env.ADMIN_PASSWORD;

      if (!adminUser || !adminPass) {
          console.error("Admin credentials environment variables not set!");
          return res.status(500).json({ message: "Server configuration error" });
      }

      if (credentials.username === adminUser && credentials.password === adminPass) {
        req.session.adminId = 1; // Use a non-guessable ID or user object if you have multiple admins
        req.session.save((err) => { // Explicitly save session before responding
            if (err) {
                console.error("Session save error during login:", err);
                return res.status(500).json({ message: "Login failed" });
            }
            return res.json({ message: "Logged in successfully" });
        });
      } else {
         return res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error('Login error:', error);
      res.status(500).json({ message: "Internal server error during login" });
    }
  });

  app.post("/admin/logout", (req, res) => { // Path: /admin/logout
    req.session.destroy((err) => {
        if (err) {
            console.error("Session destruction error during logout:", err);
            return res.status(500).json({ message: "Logout failed" });
        }
      // Clear cookie manually if needed, although destroy should handle it
      // res.clearCookie('connect.sid'); // Use the actual session cookie name if different
      res.json({ message: "Logged out successfully" });
    });
  });

  // === Protected Admin Routes (requireAuth middleware) ===

  // Get all posts (including drafts) for admin view
  app.get("/admin/posts", requireAuth, async (_req, res) => { // Path: /admin/posts
    try {
        const posts = await storage.getPosts();
        res.json(posts);
    } catch (error) {
        console.error('Admin error fetching posts:', error);
        res.status(500).json({ message: 'Failed to fetch posts for admin' });
    }
  });

  // Create a new blog post
  app.post("/posts", requireAuth, async (req, res) => { // Path: /posts 
    try {
      const postData = insertBlogPostSchema.parse(req.body);
      const post = await storage.createPost(postData);
      
      // Notify subscribers asynchronously (don't block response)
      notifyNewBlogPost(post.id).catch(err => console.error("Error notifying subscribers about new post:", err));

      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid post data", errors: error.errors });
      }
      console.error('Error creating post:', error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  // Update a blog post
  app.patch("/posts/:id", requireAuth, async (req, res) => { // Path: /posts/:id
    try {
        const postId = Number(req.params.id);
        if (isNaN(postId)) {
             return res.status(400).json({ message: "Invalid post ID" });
        }
        // Consider using a stricter schema for updates if needed
        const post = await storage.updatePost(postId, req.body); 
        res.json(post);
    } catch (error: any) {
        // Check if error is due to not found vs other DB error
        if (error.message && error.message.includes("not found")) { // Adjust if your storage throws specific errors
            return res.status(404).json({ message: "Post not found" });
        }
        console.error(`Error updating post ${req.params.id}:`, error);
        res.status(500).json({ message: "Failed to update post" });
    }
  });

  // Delete a blog post
  app.delete("/posts/:id", requireAuth, async (req, res) => { // Path: /posts/:id
    try {
        const postId = Number(req.params.id);
        if (isNaN(postId)) {
             return res.status(400).json({ message: "Invalid post ID" });
        }
        await storage.deletePost(postId);
        res.status(204).send(); // No content on successful deletion
    } catch (error: any) {
        if (error.message && error.message.includes("not found")) { // Adjust check as needed
            return res.status(404).json({ message: "Post not found" });
        }
        console.error(`Error deleting post ${req.params.id}:`, error);
        res.status(500).json({ message: "Failed to delete post" });
    }
  });

  // Create a new project
  app.post("/projects", requireAuth, async (req, res) => { // Path: /projects
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);

      // Notify subscribers asynchronously
       notifyNewProject(project.id).catch(err => console.error("Error notifying subscribers about new project:", err));

      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      console.error('Error creating project:', error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Delete a project
  app.delete("/projects/:id", requireAuth, async (req, res) => { // Path: /projects/:id
    try {
        const projectId = Number(req.params.id);
         if (isNaN(projectId)) {
             return res.status(400).json({ message: "Invalid project ID" });
        }
        await storage.deleteProject(projectId);
        res.status(204).send();
    } catch (error: any) {
         if (error.message && error.message.includes("not found")) { // Adjust check as needed
             return res.status(404).json({ message: "Project not found" });
        }
        console.error(`Error deleting project ${req.params.id}:`, error);
        res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // --- No return statement needed ---
  // The function implicitly returns void after registering routes.
}
