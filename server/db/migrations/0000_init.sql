CREATE TABLE IF NOT EXISTS "projects" (
  "id" serial PRIMARY KEY,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "image_url" text NOT NULL,
  "technologies" text[] NOT NULL,
  "live_url" text,
  "github_url" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "posts" (
  "id" serial PRIMARY KEY,
  "title" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "cover_image" text NOT NULL,
  "excerpt" text NOT NULL,
  "content" text NOT NULL,
  "published_at" timestamp with time zone NOT NULL,
  "tags" text[] NOT NULL,
  "is_draft" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "admins" (
  "id" serial PRIMARY KEY,
  "username" varchar(255) NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "subscribers" (
  "id" serial PRIMARY KEY,
  "email" varchar(255) NOT NULL UNIQUE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Insert default admin user
INSERT INTO "admins" ("username", "password_hash", "created_at")
VALUES ('admin', '$2a$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33eAxzkY6gKkPzXqFJWYSGi', now())
ON CONFLICT DO NOTHING; 