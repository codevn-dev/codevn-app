import { HomepageContent } from '@/features/homepage';
import { apiGet } from '@/lib/utils/api-client';
import type { Article } from '@/types/shared/article';
import type { Category } from '@/types/shared/category';

export const revalidate = 120; // ISR: rebuild homepage every 2 minutes

export default async function Home() {
  // Fetch initial data on server for fast LCP
  const [categories, articlesRes, featuredRes] = await Promise.all([
    apiGet<Category[]>(`/api/categories`).catch(() => []),
    apiGet<{ articles: Article[]; pagination: { hasNext: boolean } }>(
      `/api/articles?publishedOnly=true&page=1&limit=9&sortBy=createdAt&sortOrder=desc`
    ).catch(() => ({ articles: [], pagination: { hasNext: false } })),
    apiGet<{ articles: Article[] }>(`/api/articles/featured?limit=3&windowDays=14`).catch(
      () => ({ articles: [] })
    ),
  ]);

  return (
    <HomepageContent
      // These props are optional in the component; providing boosts initial render
      initialCategories={categories}
      initialArticles={articlesRes.articles}
      initialHasMore={Boolean(articlesRes.pagination?.hasNext)}
      initialFeatured={featuredRes.articles}
    />
  );
}
