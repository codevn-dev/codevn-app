'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, ThumbsUp, MessageSquare } from 'lucide-react';
import { useI18n } from '@/components/providers';
import { apiGet } from '@/lib/utils/api-client';
import type { Article } from '@/types/shared/article';

interface Props {
  articleId: string;
  initialArticles?: Article[];
}

export function RelatedArticlesSidebar({ articleId, initialArticles = [] }: Props) {
  const [items, setItems] = useState<Article[]>(initialArticles);
  const [loading, setLoading] = useState(initialArticles.length === 0);
  const { t } = useI18n();

  useEffect(() => {
    // Skip fetch if we already have initial data
    if (initialArticles.length > 0) {
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await apiGet<{ articles: Article[] }>(`/api/articles/${articleId}/related`);
        if (mounted) {
          // Filter out duplicates by ID
          const uniqueArticles = (res.articles || []).filter(
            (article, index, self) => index === self.findIndex((a) => a.id === article.id)
          );
          setItems(uniqueArticles);
        }
      } catch {
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [articleId, initialArticles.length]);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
      <div className="mb-4 text-center sm:mb-5">
        <h2 className="text-base font-bold text-gray-900 sm:text-lg">{t('articles.related')}</h2>
      </div>
      <div className="space-y-3">
        {loading && <div className="text-center text-sm text-gray-500">Loading...</div>}
        {!loading && items.length === 0 && (
          <div className="text-center text-sm text-gray-500">No related articles</div>
        )}
        {items.map((a) => (
          <Link key={a.id} href={`/articles/${a.slug}`} className="block">
            <div className="hover:shadow-3xl shadow-brand/30 hover:shadow-brand/40 group block transform cursor-pointer overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-500 ease-out hover:-translate-y-1 hover:scale-[1.01]">
              <div className="relative aspect-[16/9] w-full overflow-hidden">
                {a.thumbnail ? (
                  <img
                    src={a.thumbnail}
                    alt={a.title}
                    className="h-full w-full object-cover transition-all duration-500 ease-out group-hover:scale-110 group-hover:brightness-110"
                  />
                ) : (
                  <div
                    className="h-full w-full transition-all duration-500 ease-out group-hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, ${a.categories?.[0]?.color || '#e5e7eb'}12, #ffffff)`,
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
              <div className="p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {(a.categories || []).slice(0, 1).map((category) => (
                      <button
                        key={category.id}
                        className="inline-flex items-center rounded-full px-2.5 py-1.5 text-[10px] font-semibold sm:px-3 sm:text-xs"
                        style={{
                          backgroundColor: `${category.color}15`,
                          color: category.color,
                        }}
                      >
                        <div
                          className="mr-2 h-2 w-2 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </button>
                    ))}
                    {(a.categories || []).length > 1 && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1.5 text-[10px] font-semibold text-gray-600 sm:px-3 sm:text-xs">
                        +{(a.categories || []).length - 1}
                      </span>
                    )}
                  </div>
                  <span className="inline-flex items-center text-xs text-gray-600">
                    <Eye className="mr-1 h-3 w-3" />
                    {typeof a.views === 'number' ? a.views : 0}
                  </span>
                </div>
                <div className="mb-1 line-clamp-2 text-sm font-semibold text-gray-900">
                  {a.title}
                </div>
                <div className="mt-1 grid grid-cols-3 text-[11px] text-gray-600">
                  <div className="flex items-center justify-center gap-1.5">
                    <ThumbsUp className="h-3 w-3" />
                    <span className="tabular-nums">{a._count?.likes ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5">
                    <MessageSquare className="h-3 w-3" />
                    <span className="tabular-nums">{a._count?.comments ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700">
                      {a.author.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
