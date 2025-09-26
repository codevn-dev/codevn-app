-- =============================================
-- CONSOLIDATED DATABASE SCHEMA MIGRATION
-- =============================================

-- Create enums
CREATE TYPE "public"."reaction_type" AS ENUM('like', 'unlike');
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');

-- =============================================
-- CORE TABLES
-- =============================================

-- Users table
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password" text NOT NULL,
	"avatar" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

-- Categories table
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"slug" text NOT NULL,
	"color" text DEFAULT '#3B82F6' NOT NULL,
	"parent_id" uuid,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);

-- Articles table
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"slug" text NOT NULL,
	"thumbnail" text,
	"category_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);

-- Comments table
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"article_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);

-- Reactions table
CREATE TABLE "reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid,
	"comment_id" uuid,
	"user_id" uuid NOT NULL,
	"type" "reaction_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- =============================================
-- CHAT TABLES
-- =============================================

-- Conversations table
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text NOT NULL,
	"type" text DEFAULT 'message' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_conversation" UNIQUE ("from_user_id", "to_user_id")
);

-- Hidden conversations table
CREATE TABLE "hidden_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"hidden" boolean DEFAULT true NOT NULL,
	"hidden_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_hidden_conversation" UNIQUE ("user_id", "conversation_id")
);

-- Conversation messages table
CREATE TABLE "conversations_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" text NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text NOT NULL,
	"text" text NOT NULL,
	"iv" text NOT NULL,
	"tag" text NOT NULL,
	"seen" boolean DEFAULT false NOT NULL,
	"seen_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- =============================================
-- ANALYTICS TABLES
-- =============================================

-- Articles views table for analytics and unique view tracking
CREATE TABLE "articles_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"user_id" uuid,
	"session_id" text,
	"country_code" text,
	"device" text,
	"created_at" timestamp NOT NULL DEFAULT now()
);

-- =============================================
-- FOREIGN KEY CONSTRAINTS
-- =============================================

-- Articles foreign keys
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_categories_id_fk" 
	FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_users_id_fk" 
	FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

-- Categories foreign keys
ALTER TABLE "categories" ADD CONSTRAINT "categories_created_by_id_users_id_fk" 
	FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

-- Comments foreign keys
ALTER TABLE "comments" ADD CONSTRAINT "comments_article_id_articles_id_fk" 
	FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" 
	FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

-- Reactions foreign keys
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_article_id_articles_id_fk" 
	FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_comment_id_comments_id_fk" 
	FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" 
	FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

-- Articles views foreign keys
ALTER TABLE "articles_views" ADD CONSTRAINT "articles_views_article_id_articles_id_fk" 
	FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "articles_views" ADD CONSTRAINT "articles_views_user_id_users_id_fk" 
	FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users (created_at);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);
CREATE INDEX IF NOT EXISTS idx_users_name_lower ON public.users (lower(name));
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON public.users (lower(email));

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories (lower(name));

-- Articles indexes
CREATE INDEX IF NOT EXISTS idx_articles_author_published_created_at
	ON public.articles (author_id, published, created_at);
CREATE INDEX IF NOT EXISTS idx_articles_category_id ON public.articles (category_id);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON public.articles (created_at);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_article_created_at
	ON public.comments (article_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments (parent_id);

-- Reactions indexes
CREATE INDEX IF NOT EXISTS idx_reactions_article_type ON public.reactions (article_id, type);
CREATE INDEX IF NOT EXISTS idx_reactions_comment_type ON public.reactions (comment_id, type);
CREATE INDEX IF NOT EXISTS idx_reactions_user_type ON public.reactions (user_id, type);

-- Articles views indexes
CREATE INDEX IF NOT EXISTS idx_articles_views_article_session ON "articles_views" ("article_id", "session_id");
CREATE INDEX IF NOT EXISTS idx_articles_views_article_user ON "articles_views" ("article_id", "user_id");
CREATE INDEX IF NOT EXISTS idx_articles_views_created_at ON "articles_views" ("created_at");
CREATE INDEX IF NOT EXISTS idx_articles_views_article_created_at
	ON public.articles_views (article_id, created_at);
CREATE INDEX IF NOT EXISTS idx_articles_views_article_only
	ON public.articles_views (article_id);

-- =============================================
-- FULL-TEXT SEARCH EXTENSIONS
-- =============================================

-- Enable pg_trgm for faster ILIKE `%term%` searches and add GIN indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Users fuzzy search on name and email
CREATE INDEX IF NOT EXISTS gin_users_name_trgm ON public.users USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS gin_users_email_trgm ON public.users USING GIN (email gin_trgm_ops);

-- Articles fuzzy search on title and content
CREATE INDEX IF NOT EXISTS gin_articles_title_trgm ON public.articles USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS gin_articles_content_trgm ON public.articles USING GIN (content gin_trgm_ops);
