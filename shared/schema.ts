import { z } from "zod";

export const projectSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  imageUrl: z.string(),
  technologies: z.array(z.string()),
  liveUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  createdAt: z.string()
});

export const blogPostSchema = z.object({
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

export const adminSchema = z.object({
  id: z.number(),
  username: z.string().min(3),
  passwordHash: z.string(),
  createdAt: z.string()
});

export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6)
});

export const insertProjectSchema = projectSchema.omit({ 
  id: true,
  createdAt: true 
});

export const insertBlogPostSchema = blogPostSchema.omit({ 
  id: true,
  createdAt: true 
});

export type Project = z.infer<typeof projectSchema>;
export type BlogPost = z.infer<typeof blogPostSchema>;
export type InsertProject = {
  title: string;
  description: string;
  imageUrl: string;
  technologies: string[];
  liveUrl?: string;
  githubUrl?: string;
};
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type Admin = z.infer<typeof adminSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;