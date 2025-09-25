-- Performance indexes for common filters/joins and case-insensitive search

-- users
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users (created_at);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);
CREATE INDEX IF NOT EXISTS idx_users_name_lower ON public.users (lower(name));
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON public.users (lower(email));

-- articles
CREATE INDEX IF NOT EXISTS idx_articles_author_published_created_at
  ON public.articles (author_id, published, created_at);
CREATE INDEX IF NOT EXISTS idx_articles_category_id ON public.articles (category_id);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON public.articles (created_at);

-- comments
CREATE INDEX IF NOT EXISTS idx_comments_article_created_at
  ON public.comments (article_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments (parent_id);

-- reactions
CREATE INDEX IF NOT EXISTS idx_reactions_article_type ON public.reactions (article_id, type);
CREATE INDEX IF NOT EXISTS idx_reactions_comment_type ON public.reactions (comment_id, type);
CREATE INDEX IF NOT EXISTS idx_reactions_user_type ON public.reactions (user_id, type);

-- articles_views
CREATE INDEX IF NOT EXISTS idx_articles_views_article_created_at
  ON public.articles_views (article_id, created_at);
CREATE INDEX IF NOT EXISTS idx_articles_views_article_only
  ON public.articles_views (article_id);

-- Enable pg_trgm for faster ILIKE `%term%` searches and add GIN indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Users fuzzy search on name and email
CREATE INDEX IF NOT EXISTS gin_users_name_trgm ON public.users USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS gin_users_email_trgm ON public.users USING GIN (email gin_trgm_ops);

-- Articles fuzzy search on title and content
CREATE INDEX IF NOT EXISTS gin_articles_title_trgm ON public.articles USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS gin_articles_content_trgm ON public.articles USING GIN (content gin_trgm_ops);
