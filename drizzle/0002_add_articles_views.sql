-- articles_views table to track per-view metadata for analytics and uniqueness
CREATE TABLE IF NOT EXISTS "articles_views" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "article_id" uuid NOT NULL REFERENCES "articles"("id"),
  "user_id" uuid REFERENCES "users"("id"),
  "session_id" text,
  "country_code" text,
  "device" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Optional helpful index for uniqueness checks across a session
CREATE INDEX IF NOT EXISTS idx_articles_views_article_session ON "articles_views" ("article_id", "session_id");
CREATE INDEX IF NOT EXISTS idx_articles_views_article_user ON "articles_views" ("article_id", "user_id");
CREATE INDEX IF NOT EXISTS idx_articles_views_created_at ON "articles_views" ("created_at");

-- Drop views column from articles now that we count via articles_views
ALTER TABLE "articles" DROP COLUMN IF EXISTS "views";
