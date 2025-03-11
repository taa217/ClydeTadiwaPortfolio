import { pgTable, serial, text, timestamp, boolean, varchar } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  imageUrl: text('image_url').notNull(),
  technologies: text('technologies').array().notNull(),
  liveUrl: text('live_url'),
  githubUrl: text('github_url'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  coverImage: text('cover_image').notNull(),
  excerpt: text('excerpt').notNull(),
  content: text('content').notNull(),
  publishedAt: timestamp('published_at').notNull(),
  tags: text('tags').array().notNull(),
  isDraft: boolean('is_draft').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const admins = pgTable('admins', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 256 }).notNull(),
  passwordHash: varchar('password_hash', { length: 256 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const subscribers = pgTable('subscribers', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}); 