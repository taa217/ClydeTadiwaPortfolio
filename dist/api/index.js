var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

// server/routes.ts
import { createServer } from "http";

// server/db.ts
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

// server/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  admins: () => admins,
  posts: () => posts,
  projects: () => projects,
  subscribers: () => subscribers
});
import { pgTable, serial, text, timestamp, boolean, varchar } from "drizzle-orm/pg-core";
var projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  technologies: text("technologies").array().notNull(),
  liveUrl: text("live_url"),
  githubUrl: text("github_url"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  coverImage: text("cover_image").notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  publishedAt: timestamp("published_at").notNull(),
  tags: text("tags").array().notNull(),
  isDraft: boolean("is_draft").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 256 }).notNull(),
  passwordHash: varchar("password_hash", { length: 256 }).notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// server/db.ts
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}
var connectionConfig = {
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  ssl: process.env.PGSSLMODE === "require"
};
var pool = new pg.Pool({
  ...connectionConfig,
  // Optimized production connection pool settings
  max: 20,
  idleTimeoutMillis: 3e4,
  connectionTimeoutMillis: 1e4,
  maxUses: 7500
});
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  if (process.env.NODE_ENV !== "production") {
    process.exit(-1);
  }
});
var db = drizzle(pool, { schema: schema_exports });
async function checkDatabaseConnection() {
  let client;
  try {
    client = await pool.connect();
    await client.query("SELECT 1");
    console.log("Database connection successful");
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  } finally {
    if (client) client.release();
  }
}
setInterval(async () => {
  const isHealthy = await checkDatabaseConnection();
  if (!isHealthy && process.env.NODE_ENV === "production") {
    console.error("Database connection unhealthy, attempting to reconnect...");
  }
}, 3e4);

// server/storage.ts
import { eq } from "drizzle-orm";
import NodeCache from "node-cache";
var cache = new NodeCache({
  stdTTL: 300,
  // 5 minutes
  checkperiod: 60,
  // Check for expired keys every 60 seconds
  useClones: false
});
var DbStorage = class _DbStorage {
  constructor() {
    console.log("DbStorage initialized with methods:", Object.getOwnPropertyNames(_DbStorage.prototype));
  }
  async withRetry(operation, key, retries = 3) {
    let lastError;
    if (key) {
      const cached = cache.get(key);
      if (cached) return cached;
    }
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const result = await operation();
        if (key) {
          cache.set(key, result);
        }
        return result;
      } catch (error) {
        lastError = error;
        console.error(`Operation failed (attempt ${attempt + 1}/${retries}):`, error);
        if (attempt < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1e3));
        }
      }
    }
    throw lastError;
  }
  async getProjects() {
    return this.withRetry(
      async () => {
        const results = await db.select().from(projects).orderBy(projects.createdAt);
        return results.map((project) => ({
          ...project,
          createdAt: project.createdAt.toISOString(),
          liveUrl: project.liveUrl || void 0,
          githubUrl: project.githubUrl || void 0
        }));
      },
      "all_projects"
    );
  }
  async getProject(id) {
    return this.withRetry(
      async () => {
        const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
        if (!result.length) return void 0;
        return {
          ...result[0],
          createdAt: result[0].createdAt.toISOString(),
          liveUrl: result[0].liveUrl || void 0,
          githubUrl: result[0].githubUrl || void 0
        };
      },
      `project_${id}`
    );
  }
  async getPosts() {
    return this.withRetry(
      async () => {
        const results = await db.select().from(posts).orderBy(posts.publishedAt);
        return results.map((post) => ({
          ...post,
          publishedAt: post.publishedAt.toISOString(),
          createdAt: post.createdAt.toISOString()
        }));
      },
      "all_posts"
    );
  }
  async getPost(id) {
    return this.withRetry(
      async () => {
        const result = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
        if (!result.length) return void 0;
        return {
          ...result[0],
          publishedAt: result[0].publishedAt.toISOString(),
          createdAt: result[0].createdAt.toISOString()
        };
      },
      `post_${id}`
    );
  }
  async getPostBySlug(slug) {
    console.log("getPostBySlug called with slug:", slug);
    return this.withRetry(
      async () => {
        const result = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1);
        if (!result.length) return void 0;
        return {
          ...result[0],
          publishedAt: result[0].publishedAt.toISOString(),
          createdAt: result[0].createdAt.toISOString()
        };
      },
      `post_slug_${slug}`
    );
  }
  // Method to invalidate cache when data changes
  invalidateCache(pattern) {
    const keys = cache.keys().filter((key) => key.includes(pattern));
    keys.forEach((key) => cache.del(key));
  }
  async createProject(project) {
    const result = await this.withRetry(async () => {
      const [created] = await db.insert(projects).values(project).returning();
      return created;
    });
    this.invalidateCache("project");
    return {
      ...result,
      createdAt: result.createdAt.toISOString(),
      liveUrl: result.liveUrl || void 0,
      githubUrl: result.githubUrl || void 0
    };
  }
  async createPost(post) {
    const result = await this.withRetry(async () => {
      const [created] = await db.insert(posts).values({
        ...post,
        publishedAt: new Date(post.publishedAt)
      }).returning();
      return created;
    });
    this.invalidateCache("post");
    return {
      ...result,
      publishedAt: result.publishedAt.toISOString(),
      createdAt: result.createdAt.toISOString()
    };
  }
  async updatePost(id, updates) {
    const dbUpdates = { ...updates };
    if (updates.publishedAt) {
      dbUpdates.publishedAt = new Date(updates.publishedAt);
    }
    const [updatedPost] = await db.update(posts).set(dbUpdates).where(eq(posts.id, id)).returning();
    if (!updatedPost) {
      throw new Error("Post not found");
    }
    return {
      ...updatedPost,
      createdAt: updatedPost.createdAt.toISOString(),
      publishedAt: updatedPost.publishedAt.toISOString()
    };
  }
  async deletePost(id) {
    await db.delete(posts).where(eq(posts.id, id));
  }
  async validateAdmin(credentials) {
    if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
      return {
        id: 1,
        username: process.env.ADMIN_USERNAME,
        passwordHash: "",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    return null;
  }
  async deleteProject(id) {
    try {
      await this.withRetry(async () => {
        const result = await db.delete(projects).where(eq(projects.id, id)).returning();
        if (!result.length) {
          throw new Error("Project not found");
        }
      });
      this.invalidateCache("project");
      this.invalidateCache(`project_${id}`);
      this.invalidateCache("all_projects");
      console.log(`Project with ID: ${id} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting project with ID: ${id}:`, error);
      throw error;
    }
  }
  async addSubscriber(email) {
    let retries = 3;
    while (retries > 0) {
      try {
        const existing = await db.query.subscribers.findFirst({
          where: eq(subscribers.email, email)
        });
        if (existing) {
          throw new Error("Email already subscribed");
        }
        await db.insert(subscribers).values({
          email,
          createdAt: /* @__PURE__ */ new Date()
        });
        console.log("Successfully added subscriber:", email);
        return;
      } catch (error) {
        retries--;
        if (error instanceof Error && error.message === "Email already subscribed") {
          throw error;
        }
        console.error(`Error adding subscriber (${retries} retries left):`, error);
        if (retries === 0) {
          throw new Error("Failed to add subscriber after multiple attempts");
        }
        await new Promise((resolve) => setTimeout(resolve, 1e3));
      }
    }
  }
  async getSubscribers() {
    const results = await db.select({
      id: subscribers.id,
      email: subscribers.email,
      createdAt: subscribers.createdAt
    }).from(subscribers);
    return results.map((subscriber) => ({
      ...subscriber,
      createdAt: subscriber.createdAt.toISOString()
    }));
  }
};
var storage = new DbStorage();
console.log("Storage instance created with methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(storage)));

// shared/schema.ts
import { z } from "zod";
var projectSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  imageUrl: z.string(),
  technologies: z.array(z.string()),
  liveUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  createdAt: z.string()
});
var blogPostSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  coverImage: z.string(),
  excerpt: z.string(),
  content: z.string(),
  publishedAt: z.string(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  isDraft: z.boolean().default(false)
});
var adminSchema = z.object({
  id: z.number(),
  username: z.string().min(3),
  passwordHash: z.string(),
  createdAt: z.string()
});
var loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6)
});
var insertProjectSchema = projectSchema.omit({
  id: true,
  createdAt: true
});
var insertBlogPostSchema = blogPostSchema.omit({
  id: true,
  createdAt: true
});

// server/routes.ts
import session from "express-session";
import { z as z2 } from "zod";

// server/email.ts
import nodemailer from "nodemailer";
var transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  // Fixed typo: smpt -> smtp
  port: 587,
  secure: false,
  // true for 465, false for other ports
  auth: {
    user: "clydetadiwa8@gmail.com",
    pass: process.env.EMAIL_PASS
  },
  // Add additional configuration for reliability
  pool: true,
  // Use pooled connections
  maxConnections: 3,
  // Maximum number of connections to make
  maxMessages: 100,
  // Maximum number of messages to send using a connection
  rateDelta: 1e3,
  // Define the time window for rate limiting (in ms)
  rateLimit: 5
  // Maximum number of messages to send in rateDelta time window
});
async function sendEmail(options) {
  try {
    await transporter.verify();
    const info = await transporter.sendMail({
      from: '"Clyde Tadiwa" <clydetadiwa8@gmail.com>',
      // Fixed sender address
      to: options.to,
      subject: options.subject,
      html: options.html
    });
    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
    if (error instanceof Error) {
      if (error.message.includes("ENOTFOUND")) {
        throw new Error("Failed to connect to email server. Please check your internet connection and server settings.");
      } else if (error.message.includes("EAUTH")) {
        throw new Error("Email authentication failed. Please check your credentials.");
      } else if (error.message.includes("ETIMEDOUT")) {
        throw new Error("Email server connection timed out. Please try again.");
      }
    }
    throw new Error("Failed to send email.");
  }
}

// server/notifications.ts
async function notifyNewBlogPost(postId) {
  try {
    const post = await storage.getPost(postId);
    if (!post) {
      console.error(`Post with ID ${postId} not found.`);
      return;
    }
    const subscribers2 = await storage.getSubscribers();
    const subject = `\u2728 New Blog Post Alert: ${post.title} is Now Live!`;
    const html = `
      <div style="font-family: 'Roboto', 'Arial', sans-serif; color: #333; margin: 0; padding: 20px; background-color: #f8f8f8;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding: 30px 0; text-align: center;">
                    <h1 style="font-size: 28px; margin-bottom: 20px; color: #007bff;">${post.title}</h1>
                    <p style="font-size: 16px; color: #777;">Published on ${new Date(post.publishedAt).toLocaleDateString()}</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <a href="https://clydetadiwa.vercel.app/blog/${post.slug}" style="display: block;">
                      <img src="${post.coverImage}" alt="${post.title}" style="width: 100%; border-radius: 8px; margin-bottom: 20px; display: block;">
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 20px;">
                    <p style="font-size: 16px; line-height: 1.6; color: #555;">
                      ${post.excerpt}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 0; text-align: center;">
                    <a href="https://clydetadiwa.vercel.app/blog/${post.slug}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
                      Read the Full Post &rarr;
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 30px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 14px;">
                    <p style="margin-bottom: 10px;">Stay updated with the latest insights. <a href="https://clydetadiwa.com" style="color: #007bff; text-decoration: none;">Visit Our Blog</a></p>
                    <p style="margin-bottom: 0;">&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} Clyde Tadiwa. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `;
    await Promise.all(subscribers2.map(
      (subscriber) => sendEmail({ to: subscriber.email, subject, html })
    ));
    console.log(`Successfully notified subscribers about new blog post: ${post.title}`);
  } catch (error) {
    console.error("Error notifying subscribers about new blog post:", error);
  }
}
async function notifyNewProject(projectId) {
  try {
    const project = await storage.getProject(projectId);
    if (!project) {
      console.error(`Project with ID ${projectId} not found.`);
      return;
    }
    const subscribers2 = await storage.getSubscribers();
    const subject = `\u{1F680} New Project Showcase: ${project.title} is Live!`;
    const html = `
      <div style="font-family: 'Roboto', 'Arial', sans-serif; color: #333; margin: 0; padding: 20px; background-color: #f8f8f8;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding: 30px 0; text-align: center;">
                    <h1 style="font-size: 28px; margin-bottom: 20px; color: #007bff;">${project.title}</h1>
                    <p style="font-size: 16px; color: #777;">Explore our latest creation!</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <a href="https://clydetadiwa.com/projects" style="display: block;">
                      <img src="${project.imageUrl}" alt="${project.title}" style="width: 100%; border-radius: 8px; margin-bottom: 20px; display: block;">
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 20px;">
                    <p style="font-size: 16px; line-height: 1.6; color: #555; margin-bottom: 20px;">
                      ${project.description}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 0; text-align: center;">
                    <a href="https://clydetadiwa.com/projects" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
                      View Project Details &rarr;
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 30px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 14px;">
                    <p style="margin-bottom: 10px;">Discover more exciting projects. <a href="https://clydetadiwa.com/projects" style="color: #007bff; text-decoration: none;">See Our Portfolio</a></p>
                    <p style="margin-bottom: 0;">&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} Clyde Tadiwa. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `;
    await Promise.all(subscribers2.map(
      (subscriber) => sendEmail({ to: subscriber.email, subject, html })
    ));
    console.log(`Successfully notified subscribers about new project: ${project.title}`);
  } catch (error) {
    console.error("Error notifying subscribers about new project:", error);
  }
}

// server/routes.ts
import express from "express";
var requireAuth = (req, res, next) => {
  if (!req.session.adminId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};
var subscribeSchema = z2.object({
  email: z2.string().email()
});
var router = express.Router();
var storage2 = new DbStorage();
console.log("Router storage methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(storage2)));
router.get("/posts/:slug", async (req, res) => {
  try {
    const post = await storage2.getPostBySlug(req.params.slug);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json(post);
  } catch (error) {
    console.error("Error fetching post by slug:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
async function registerRoutes(app2) {
  app2.use(
    session({
      secret: process.env.SESSION_SECRET || "your-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1e3
        // 24 hours
      }
    })
  );
  app2.get("/api/projects", async (_req, res) => {
    const projects2 = await storage2.getProjects();
    res.json(projects2);
  });
  app2.get("/api/projects/:id", async (req, res) => {
    const project = await storage2.getProject(Number(req.params.id));
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.json(project);
  });
  app2.get("/api/posts", async (_req, res) => {
    const posts2 = await storage2.getPosts();
    const publishedPosts = posts2.filter((post) => !post.isDraft);
    res.json(publishedPosts);
  });
  app2.get("/api/posts/:slug", async (req, res) => {
    const post = await storage2.getPostBySlug(req.params.slug);
    if (!post || post.isDraft) {
      return res.status(404).json({ message: "Blog post not found" });
    }
    res.json(post);
  });
  app2.get("/api/admin/auth-check", (req, res) => {
    if (req.session.adminId) {
      return res.status(200).json({ authenticated: true });
    } else {
      return res.status(401).json({ authenticated: false });
    }
  });
  app2.post("/api/admin/login", async (req, res) => {
    try {
      console.log("Login attempt:", req.body);
      const credentials = loginSchema.parse(req.body);
      if (credentials.username === process.env.ADMIN_USERNAME && credentials.password === process.env.ADMIN_PASSWORD) {
        req.session.adminId = 1;
        return res.json({ message: "Logged in successfully" });
      }
      return res.status(401).json({ message: "Invalid credentials" });
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/admin/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out successfully" });
    });
  });
  app2.get("/api/admin/posts", requireAuth, async (_req, res) => {
    const posts2 = await storage2.getPosts();
    res.json(posts2);
  });
  app2.post("/api/posts", requireAuth, async (req, res) => {
    try {
      const postData = insertBlogPostSchema.parse(req.body);
      const post = await storage2.createPost(postData);
      res.status(201).json(post);
      await notifyNewBlogPost(post.id);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid post data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.patch("/api/posts/:id", requireAuth, async (req, res) => {
    try {
      const post = await storage2.updatePost(Number(req.params.id), req.body);
      res.json(post);
    } catch (error) {
      res.status(404).json({ message: "Post not found" });
    }
  });
  app2.delete("/api/posts/:id", requireAuth, async (req, res) => {
    try {
      await storage2.deletePost(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ message: "Post not found" });
    }
  });
  app2.post("/api/projects", requireAuth, async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage2.createProject(projectData);
      res.status(201).json(project);
      await notifyNewProject(project.id);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.delete("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      await storage2.deleteProject(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ message: "Project not found" });
    }
  });
  app2.post("/api/subscribe", async (req, res) => {
    try {
      const { email } = subscribeSchema.parse(req.body);
      await storage2.addSubscriber(email);
      res.status(200).json({ message: "Subscribed successfully!" });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid email format", errors: error.errors });
      }
      if (error.message === "Email already subscribed") {
        return res.status(409).json({ message: error.message });
      }
      console.error("Subscription error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path2 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path2.startsWith("/api")) {
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      console.log(logLine);
    }
  });
  next();
});
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});
registerRoutes(app).catch((err) => {
  console.error("Failed to register routes:", err);
});
app.use((err, _req, res, _next) => {
  console.error("Server error:", err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3e3;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
var server_default = app;
export {
  server_default as default
};
