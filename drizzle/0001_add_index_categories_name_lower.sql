-- Index to speed up lookups by category name (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories (lower(name));

