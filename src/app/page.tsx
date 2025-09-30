import { HomepageContent } from '@/features/homepage';
import { apiParallel } from '@/lib/utils/api-client';

export const revalidate = 120; // ISR: rebuild homepage every 2 minutes

export default async function Home() {
  // Fetch initial data on server for fast LCP using apiParallel
  const [categories, articlesRes, featuredRes] = await apiParallel([
    { method: 'GET', endpoint: '/api/categories' },
    {
      method: 'GET',
      endpoint: '/api/articles?publishedOnly=true&page=1&limit=9&sortBy=createdAt&sortOrder=desc',
    },
    {
      method: 'GET',
      endpoint: '/api/articles/featured?limit=3&windowDays=14',
    },
  ]).catch(() => [
    [], // Fallback for categories
    { articles: [], pagination: { hasNext: false } }, // Fallback for articlesRes
    { articles: [] }, // Fallback for featuredRes
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
