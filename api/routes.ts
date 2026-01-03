import type { Express, Request, Response, NextFunction } from "express";
import fs from 'fs';
import path from 'path';
// createServer is no longer needed for the return type here, but keep if used elsewhere locally
// import { createServer } from "http"; 
import { DbStorage } from "./storage.js";
import { loginSchema, insertBlogPostSchema, type LoginCredentials, insertProjectSchema, type InsertProject } from "../shared/schema.js";
import { z } from "zod";
import { notifyNewBlogPost, notifyNewProject } from "./notifications.js";
import { testEmailConfiguration, checkGmailSetup, sendEmail } from "./email.js";
import express from 'express';
import jwt from 'jsonwebtoken';

// JWT utilities
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

const generateToken = (adminId: number): string => {
  return jwt.sign({ adminId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const verifyToken = (token: string): { adminId: number } | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as { adminId: number };
  } catch (error) {
    return null;
  }
};

// Middleware to check if user is authenticated via JWT
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ Auth failed - No authorization header or invalid format');
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const payload = verifyToken(token);

  if (!payload) {
    console.log('❌ Auth failed - Invalid or expired token');
    return res.status(401).json({ message: "Unauthorized" });
  }

  console.log('✅ Auth success - Valid token for adminId:', payload.adminId);
  // Add adminId to request for use in protected routes
  (req as any).adminId = payload.adminId;
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
router.get('/api/posts/:slug', async (req, res) => {
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

  // === Public Routes ===

  // Server-side rendering for SEO
  app.get(["/blog/:slug", "/projects/:id"], async (req, res, next) => {
    // Check if this is an API request (shouldn't be due to Vercel rewrites, but good to be safe)
    if (req.path.startsWith('/api')) return next();

    try {
      const isBlog = req.path.startsWith('/blog/');
      let title = "Clyde Tadiwa · Portfolio";
      let description = "Personal portfolio and blog of Clyde Tadiwa.";
      let image = "/assets/og-image.png";
      let url = `https://clydetadiwa.blog${req.path}`;

      const ensureAbsolute = (path: string) => {
        if (!path) return path;
        if (path.startsWith('http')) return path;
        return `https://clydetadiwa.blog${path.startsWith('/') ? '' : '/'}${path}`;
      };

      if (isBlog) {
        const slug = req.params.slug;
        const post = await storage.getPostBySlug(slug);
        if (post) {
          title = post.title;
          description = post.excerpt || post.title;
          image = post.coverImage || image;
        }
      } else {
        const id = Number(req.params.id);
        if (!isNaN(id)) {
          const project = await storage.getProject(id);
          if (project) {
            title = project.title;
            description = project.shortDescription || project.title;
            image = project.imageUrl || image;
          }
        }
      }

      // Ensure image is absolute
      image = ensureAbsolute(image);

      // Read index.html
      let template = "";
      const possiblePaths = [
        path.join(process.cwd(), 'dist', 'public', 'index.html'),
        path.join(process.cwd(), 'public', 'index.html'),
      ];

      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          template = fs.readFileSync(p, 'utf-8');
          break;
        }
      }

      if (!template) {
        console.error("Could not find index.html template");
        // Fallback to simple HTML if template is missing (shouldn't happen in prod)
        return res.send(`<!DOCTYPE html><html><head>
          <meta property="og:title" content="${title}" />
          <meta property="og:description" content="${description}" />
          <meta property="og:image" content="${image}" />
        </head><body><h1>Redirecting...</h1><script>window.location.reload();</script></body></html>`);
      }

      // Inject tags
      const headInjection = `
        <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
        <meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />
        <meta property="og:image" content="${image.replace(/"/g, '&quot;')}" />
        <meta property="og:url" content="${url.replace(/"/g, '&quot;')}" />
        <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
        <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />
        <meta name="twitter:image" content="${image.replace(/"/g, '&quot;')}" />
      `;

      const html = template.replace('<!--HEAD_INJECTION-->', headInjection);
      res.send(html);

    } catch (error) {
      console.error("Error serving SSR page:", error);
      next();
    }
  });

  // Screenshot proxy route (with CDN-friendly caching)
  app.get("/api/screenshot", async (req, res) => {
    try {
      const targetUrl = String(req.query.url || "").trim();
      const widthParam = Number(req.query.w || 1200);
      const heightParam = req.query.h ? Number(req.query.h) : undefined;

      // Basic validation
      if (!targetUrl) {
        return res.status(400).send("");
      }
      let urlObj: URL;
      try {
        urlObj = new URL(targetUrl);
      } catch {
        return res.status(400).send("");
      }
      if (!(urlObj.protocol === "http:" || urlObj.protocol === "https:")) {
        return res.status(400).send("");
      }

      // Clamp width/height to sensible bounds
      const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
      const width = clamp(isNaN(widthParam) ? 1200 : widthParam, 320, 2000);
      const height = heightParam !== undefined ? clamp(isNaN(heightParam) ? 0 : heightParam, 0, 1200) : undefined;

      // Use thum.io as a lightweight external screenshot provider
      // Docs: https://image.thum.io/
      // "maxAge" hints provider-side caching; we also set CDN caching headers below
      const thumSegments = [
        "https://image.thum.io/get",
        "maxAge/86400", // 24h provider cache
        `width / ${width} `,
      ];
      if (height && height > 0) {
        thumSegments.push(`crop / ${height} `);
      }
      const providerUrl = `${thumSegments.join("/")}/${encodeURIComponent(urlObj.toString())}`;

      const response = await fetch(providerUrl, {
        // Provide a UA; some providers block default serverless bots
        headers: { "User-Agent": "PersonalPortfolio/1.0 (+screenshot-proxy)" },
      });

      if (!response.ok) {
        // Surface error status so <img onError> triggers on the client
        return res.status(response.status).send("");
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      // Encourage Vercel CDN caching
      res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");

      const arrayBuffer = await response.arrayBuffer();
      return res.status(200).send(Buffer.from(arrayBuffer));
    } catch (error) {
      console.error("Error generating screenshot:", error);
      return res.status(500).send("");
    }
  });

  // Project routes
  app.get("/api/projects", async (_req, res) => { // Path: /projects
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ message: 'Failed to fetch projects' });
    }
  });

  app.get("/api/projects/:id", async (req, res) => { // Path: /projects/:id
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

  // Blog post routes - Public API for published posts
  app.get("/api/posts", async (_req, res) => { // Public route for published posts
    try {
      const posts = await storage.getPosts();
      // Only return published posts for public viewing
      const publishedPosts = posts.filter(post => !post.isDraft);
      res.json(publishedPosts);
    } catch (error) {
      console.error('Error fetching published posts:', error);
      res.status(500).json({ message: 'Failed to fetch posts' });
    }
  });

  app.get("/api/posts/:slug", async (req, res) => { // Path: /posts/:slug
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

  // -------- SEO & Discovery Endpoints --------
  // Sitemap XML
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const base = process.env.SITE_URL?.replace(/\/$/, "") || "";
      const allPosts = await storage.getPosts();
      const posts = allPosts.filter(p => !p.isDraft);
      const projects = await storage.getProjects();

      const urls: string[] = [];
      urls.push(`${base || ''}/`);
      urls.push(`${base || ''}/projects`);
      urls.push(`${base || ''}/blog`);
      for (const post of posts) {
        urls.push(`${base || ''}/blog/${post.slug}`);
      }

      const now = new Date().toISOString();
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
        urls.map(u => `\n  <url><loc>${u}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`).join("") +
        `\n</urlset>`;

      res.setHeader('Content-Type', 'application/xml');
      res.send(xml);
    } catch (error) {
      console.error('Error generating sitemap:', error);
      res.status(500).send('');
    }
  });

  // Robots.txt
  app.get("/robots.txt", (_req, res) => {
    const base = process.env.SITE_URL?.replace(/\/$/, "");
    const body = [
      'User-agent: *',
      'Allow: /',
      `Sitemap: ${base ? base : ''}/sitemap.xml`,
    ].join('\n');
    res.setHeader('Content-Type', 'text/plain');
    res.send(body);
  });

  // RSS 2.0 feed
  app.get("/rss.xml", async (_req, res) => {
    try {
      const base = process.env.SITE_URL?.replace(/\/$/, "") || "";
      const allPosts = await storage.getPosts();
      const posts = allPosts.filter(p => !p.isDraft).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

      const channelTitle = 'Blog feed';
      const channelLink = `${base || ''}/blog`;
      const channelDesc = 'Latest posts';

      const items = posts.map(p => `\n  <item>\n    <title><![CDATA[${p.title}]]></title>\n    <link>${base || ''}/blog/${p.slug}</link>\n    <guid>${base || ''}/blog/${p.slug}</guid>\n    <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>\n    <description><![CDATA[${p.excerpt}]]></description>\n  </item>`).join("");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n  <title><![CDATA[${channelTitle}]]></title>\n  <link>${channelLink}</link>\n  <description><![CDATA[${channelDesc}]]></description>${items}\n</channel>\n</rss>`;

      res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
      res.send(xml);
    } catch (error) {
      console.error('Error generating RSS feed:', error);
      res.status(500).send('');
    }
  });

  // JSON Feed v1
  app.get("/feed.json", async (_req, res) => {
    try {
      const base = process.env.SITE_URL?.replace(/\/$/, "") || "";
      const allPosts = await storage.getPosts();
      const posts = allPosts.filter(p => !p.isDraft).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

      const feed = {
        version: "https://jsonfeed.org/version/1",
        title: "Blog feed",
        home_page_url: `${base || ''}/blog`,
        feed_url: `${base || ''}/feed.json`,
        items: posts.map(p => ({
          id: `${base || ''}/blog/${p.slug}`,
          url: `${base || ''}/blog/${p.slug}`,
          title: p.title,
          content_html: p.content,
          summary: p.excerpt,
          date_published: new Date(p.publishedAt).toISOString(),
          tags: p.tags,
          image: p.coverImage,
          author: { name: 'Clyde Tadiwa' },
        }))
      };

      res.setHeader('Content-Type', 'application/feed+json; charset=utf-8');
      res.json(feed);
    } catch (error) {
      console.error('Error generating JSON feed:', error);
      res.status(500).json({});
    }
  });

  // Admin posts route - duplicate of public but without auth for now (temporary fix)
  app.get("/api/admin/posts", async (_req, res) => { // Admin route - all posts including drafts
    try {
      const posts = await storage.getPosts();
      // Return ALL posts for admin (including drafts)
      res.json(posts);
    } catch (error) {
      console.error('Error fetching all posts for admin:', error);
      res.status(500).json({ message: 'Failed to fetch posts' });
    }
  });

  // Admin get single post by id (includes drafts)
  app.get("/api/admin/posts/:id", requireAuth, async (req, res) => { // Path: /admin/posts/:id
    try {
      const postId = Number(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ message: "Invalid post ID" });
      }
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error(`Error fetching admin post ${req.params.id}:`, error);
      res.status(500).json({ message: 'Failed to fetch post' });
    }
  });

  // Subscription route
  app.post("/api/subscribe", async (req, res) => { // Path: /subscribe
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

  app.get("/api/admin/auth-check", (req, res) => { // Path: /admin/auth-check
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(200).json({ authenticated: false });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      return res.status(200).json({ authenticated: false });
    }

    return res.status(200).json({ authenticated: true });
  });

  app.post("/api/admin/login", async (req, res) => { // Path: /admin/login
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
        const token = generateToken(1); // Use admin ID 1
        console.log('🔑 Generated JWT token for admin login');

        return res.json({
          message: "Logged in successfully",
          token: token
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

  app.post("/api/admin/logout", (req, res) => { // Path: /admin/logout
    // With JWT, logout is handled client-side by removing the token
    // No server-side state to clean up
    res.json({ message: "Logged out successfully" });
  });

  // Test email configuration endpoint
  app.post("/api/admin/test-email", requireAuth, async (req, res) => { // Path: /admin/test-email
    try {
      console.log('Testing email configuration...');

      const usingResend = Boolean(process.env.RESEND_API_KEY);
      let gmailSetupMsg: string | undefined;

      if (!usingResend) {
        // Only check Gmail if Resend is not configured
        const setupCheck = await checkGmailSetup();
        console.log('Gmail setup check:', setupCheck);
        gmailSetupMsg = setupCheck.message;
        if (!setupCheck.isValid) {
          return res.status(400).json({
            success: false,
            message: setupCheck.message,
            details: 'Email configuration issue detected'
          });
        }
      }

      // Test connection via selected provider
      const isConfigValid = await testEmailConfiguration();
      console.log('Email config test result:', isConfigValid);
      if (!isConfigValid) {
        return res.status(500).json({
          success: false,
          message: 'Email configuration test failed',
          details: `Unable to connect to ${usingResend ? 'Resend API' : 'Gmail SMTP server'}`
        });
      }

      // Send a test email to the admin
      const testEmailBody = {
        to: 'clydetadiwa8@gmail.com', // Send test email to yourself
        subject: '✅ Email Configuration Test - Success!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #28a745;">Email Configuration Test Successful!</h2>
            <p>This is a test email to confirm that your email notification system is working correctly.</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Test Details:</h3>
              <ul>
                <li><strong>Time:</strong> ${new Date().toISOString()}</li>
                <li><strong>Server:</strong> Vercel Serverless Function</li>
                <li><strong>Email Service:</strong> ${usingResend ? 'Resend' : 'Gmail SMTP'}</li>
              </ul>
            </div>
            <p style="color: #6c757d; font-size: 14px;">
              If you received this email, your notification system is working properly and subscribers will receive notifications when you publish new posts or projects.
            </p>
          </div>
        `
      };

      console.log('Sending test email...');
      await sendEmail(testEmailBody);
      console.log('Test email sent successfully');

      res.json({
        success: true,
        message: 'Email configuration test passed! Check your inbox for the test email.',
        details: {
          setupCheck: usingResend ? 'Resend configured' : (gmailSetupMsg || 'Gmail configured'),
          connectionTest: 'Passed',
          testEmailSent: true
        }
      });

    } catch (error) {
      console.error('Email test failed:', error);
      res.status(500).json({
        success: false,
        message: 'Email test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Check Vercel logs for more details'
      });
    }
  });

  // === Protected Admin Routes (requireAuth middleware) ===

  // Create a new blog post
  app.post("/api/posts", requireAuth, async (req, res) => { // Path: /posts 
    try {
      const postData = insertBlogPostSchema.parse(req.body);
      const post = await storage.createPost(postData);

      // Notify subscribers and wait; ensures work happens before serverless freeze
      await notifyNewBlogPost(post.id).catch(err => console.error("Error notifying subscribers about new post:", err));

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
  app.patch("/api/posts/:id", requireAuth, async (req, res) => { // Path: /posts/:id
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
  app.delete("/api/posts/:id", requireAuth, async (req, res) => { // Path: /posts/:id
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
  app.post("/api/projects", requireAuth, async (req, res) => { // Path: /projects
    console.log('HANDLER /projects: req.path =', req.path);
    console.log('HANDLER /projects: req.originalUrl =', req.originalUrl);
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);

      // Notify subscribers and wait; ensures work happens before serverless freeze
      await notifyNewProject(project.id).catch(err => console.error("Error notifying subscribers about new project:", err));

      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      console.error('Error creating project:', error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Update a project
  app.patch("/api/projects/:id", requireAuth, async (req, res) => { // Path: /projects/:id
    try {
      const projectId = Number(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Validate incoming body partially using insertProjectSchema by making all fields optional
      const partialSchema = insertProjectSchema.partial();
      const updates = partialSchema.parse(req.body);

      const updated = await storage.updateProject(projectId, updates);
      res.json(updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      if (error.message && error.message.includes("not found")) {
        return res.status(404).json({ message: "Project not found" });
      }
      console.error(`Error updating project ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Delete a project
  app.delete("/api/projects/:id", requireAuth, async (req, res) => { // Path: /projects/:id
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
