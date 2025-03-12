import { db } from './db';
import { projects, posts, admins, subscribers } from './db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import type { Project, BlogPost, InsertProject, InsertBlogPost, Admin, LoginCredentials } from "@shared/schema";
import NodeCache from 'node-cache';

// Initialize cache with 5 minutes standard TTL
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false
});

export interface IStorage {
  // Existing methods
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  getPosts(): Promise<BlogPost[]>;
  getPost(id: number): Promise<BlogPost | undefined>;
  getPostBySlug(slug: string): Promise<BlogPost | undefined>;
  createPost(post: InsertBlogPost): Promise<BlogPost>;

  // New methods for blog CMS
  updatePost(id: number, post: Partial<InsertBlogPost>): Promise<BlogPost>;
  deletePost(id: number): Promise<void>;
  validateAdmin(credentials: LoginCredentials): Promise<Admin | null>;
  addSubscriber(email: string): Promise<void>;
  getSubscribers(): Promise<{ id: number; email: string; createdAt: string }[]>;
}

export class DbStorage implements IStorage {
  constructor() {
    // Add this to verify the class is instantiated
    console.log('DbStorage initialized with methods:', Object.getOwnPropertyNames(DbStorage.prototype));
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    key?: string,
    retries = 3
  ): Promise<T> {
    let lastError;
    
    // Check cache first if key provided
    if (key) {
      const cached = cache.get<T>(key);
      if (cached) return cached;
    }

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const result = await operation();
        
        // Store in cache if key provided
        if (key) {
          cache.set(key, result);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        console.error(`Operation failed (attempt ${attempt + 1}/${retries}):`, error);
        
        // Wait before retrying, with exponential backoff
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError;
  }

  async getProjects(): Promise<Project[]> {
    return this.withRetry(
      async () => {
        const results = await db.select().from(projects).orderBy(projects.createdAt);
        return results.map(project => ({
          ...project,
          createdAt: project.createdAt.toISOString(),
          liveUrl: project.liveUrl || undefined,
          githubUrl: project.githubUrl || undefined
        }));
      },
      'all_projects'
    );
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.withRetry(
      async () => {
        const result = await db.select()
          .from(projects)
          .where(eq(projects.id, id))
          .limit(1);
        
        if (!result.length) return undefined;
        
        return {
          ...result[0],
          createdAt: result[0].createdAt.toISOString(),
          liveUrl: result[0].liveUrl || undefined,
          githubUrl: result[0].githubUrl || undefined
        };
      },
      `project_${id}`
    );
  }

  async getPosts(): Promise<BlogPost[]> {
    return this.withRetry(
      async () => {
        const results = await db.select()
          .from(posts)
          .orderBy(posts.publishedAt);
        
        return results.map(post => ({
          ...post,
          publishedAt: post.publishedAt.toISOString(),
          createdAt: post.createdAt.toISOString()
        }));
      },
      'all_posts'
    );
  }

  async getPost(id: number): Promise<BlogPost | undefined> {
    return this.withRetry(
      async () => {
        const result = await db.select()
          .from(posts)
          .where(eq(posts.id, id))
          .limit(1);
        
        if (!result.length) return undefined;
        
        return {
          ...result[0],
          publishedAt: result[0].publishedAt.toISOString(),
          createdAt: result[0].createdAt.toISOString()
        };
      },
      `post_${id}`
    );
  }

  async getPostBySlug(slug: string): Promise<BlogPost | undefined> {
    console.log('getPostBySlug called with slug:', slug); // Debug log
    return this.withRetry(
      async () => {
        const result = await db.select()
          .from(posts)
          .where(eq(posts.slug, slug))
          .limit(1);
        
        if (!result.length) return undefined;
        
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
  private invalidateCache(pattern: string) {
    const keys = cache.keys().filter(key => key.includes(pattern));
    keys.forEach(key => cache.del(key));
  }

  async createProject(project: InsertProject): Promise<Project> {
    const result = await this.withRetry(async () => {
      const [created] = await db.insert(projects)
        .values(project)
        .returning();
      return created;
    });

    this.invalidateCache('project');
    return {
      ...result,
      createdAt: result.createdAt.toISOString(),
      liveUrl: result.liveUrl || undefined,
      githubUrl: result.githubUrl || undefined
    };
  }

  async createPost(post: InsertBlogPost): Promise<BlogPost> {
    const result = await this.withRetry(async () => {
      const [created] = await db.insert(posts)
        .values({
          ...post,
          publishedAt: new Date(post.publishedAt)
        })
        .returning();
      return created;
    });

    this.invalidateCache('post');
    return {
      ...result,
      publishedAt: result.publishedAt.toISOString(),
      createdAt: result.createdAt.toISOString()
    };
  }

  async updatePost(id: number, updates: Partial<InsertBlogPost>): Promise<BlogPost> {
    // Create a new object for the database update
    const dbUpdates: any = { ...updates };
    
    // Convert publishedAt from string to Date if it exists
    if (updates.publishedAt) {
      dbUpdates.publishedAt = new Date(updates.publishedAt);
    }
    
    const [updatedPost] = await db
      .update(posts)
      .set(dbUpdates)
      .where(eq(posts.id, id))
      .returning();
    
    if (!updatedPost) {
      throw new Error("Post not found");
    }
    
    return {
      ...updatedPost,
      createdAt: updatedPost.createdAt.toISOString(),
      publishedAt: updatedPost.publishedAt.toISOString()
    };
  }

  async deletePost(id: number): Promise<void> {
    await db.delete(posts).where(eq(posts.id, id));
  }

  async validateAdmin(credentials: LoginCredentials): Promise<Admin | null> {
    if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
      return {
        id: 1,
        username: process.env.ADMIN_USERNAME,
        passwordHash: '',
        createdAt: new Date().toISOString()
      };
    }
    return null;
  }

  async deleteProject(id: number): Promise<void> {
    try {
      await this.withRetry(async () => {
        const result = await db.delete(projects)
          .where(eq(projects.id, id))
          .returning();
        
        if (!result.length) {
          throw new Error('Project not found');
        }
      });

      // Invalidate all project-related caches
      this.invalidateCache('project');
      this.invalidateCache(`project_${id}`);
      this.invalidateCache('all_projects');
      
      console.log(`Project with ID: ${id} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting project with ID: ${id}:`, error);
      throw error;
    }
  }

  async addSubscriber(email: string): Promise<void> {
    let retries = 3;
    
    while (retries > 0) {
      try {
        // First check if email already exists
        const existing = await db.query.subscribers.findFirst({
          where: eq(subscribers.email, email)
        });

        if (existing) {
          throw new Error('Email already subscribed');
        }

        // Add new subscriber with retry logic
        await db.insert(subscribers).values({
          email,
          createdAt: new Date()
        });

        console.log('Successfully added subscriber:', email);
        return;

      } catch (error) {
        retries--;
        if (error instanceof Error && error.message === 'Email already subscribed') {
          throw error; // Don't retry for duplicate emails
        }
        
        console.error(`Error adding subscriber (${retries} retries left):`, error);
        
        if (retries === 0) {
          throw new Error('Failed to add subscriber after multiple attempts');
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  async getSubscribers(): Promise<{ id: number; email: string; createdAt: string }[]> {
    const results = await db.select({
      id: subscribers.id,
      email: subscribers.email,
      createdAt: subscribers.createdAt
    }).from(subscribers);

    return results.map(subscriber => ({
      ...subscriber,
      createdAt: subscriber.createdAt.toISOString()
    }));
  }
}

export const storage = new DbStorage();

// Add this to verify the export
console.log('Storage instance created with methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(storage)));