'use client';

import { MotionContainer } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { Article } from '@/types/shared';
import { useI18n } from '@/components/providers';
import { ArticleCard } from './article-card';

interface ArticlesListProps {
  articles: Article[];
  selectedCategoryNames: string[];
  mounted: boolean;
  isLoadingMore: boolean;
  hasMoreArticles: boolean;
  isLoading: boolean;
  onlyMine?: boolean;
  onCategoryClick: (categoryName: string) => void;
  onClearFilters: () => void;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
}

export function ArticlesList({
  articles,
  selectedCategoryNames,
  mounted,
  isLoadingMore,
  hasMoreArticles,
  isLoading,
  onCategoryClick,
  onClearFilters,
  loadMoreRef,
}: ArticlesListProps) {
  const { t } = useI18n();

  const filteredArticles = Array.isArray(articles)
    ? articles.filter((a) => (a as any)?.published === true)
    : [];

  return (
    <div>
      <h2
        className="mb-1 text-xl font-bold text-gray-900 sm:mb-2 sm:text-3xl"
        suppressHydrationWarning
      >
        {mounted ? t('home.latestArticles') : ''}
      </h2>
      <p className="mb-10 text-base text-gray-600 sm:text-lg" suppressHydrationWarning>
        {mounted ? t('home.tagline') : ''}
      </p>

      <div className="grid grid-cols-1 gap-3 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredArticles.map((article, index) => (
          <ArticleCard
            key={article.id}
            article={article}
            index={index}
            onCategoryClick={onCategoryClick}
            variant="list"
          />
        ))}
      </div>

      {filteredArticles.length === 0 && (
        <div className="px-4 py-12 text-center sm:py-16">
          <div className="from-brand/20 to-brand-700/20 mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br sm:mb-6 sm:h-20 sm:w-20">
            <BookOpen className="text-brand h-8 w-8 sm:h-10 sm:w-10" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-900 sm:mb-3 sm:text-2xl">
            {t('home.noArticlesFound')}
          </h3>
          <p className="mx-auto mb-6 max-w-md text-base text-gray-700 sm:mb-8 sm:text-lg">
            {selectedCategoryNames.length > 0
              ? "Try adjusting your filter criteria to find what you're looking for."
              : t('home.beFirstToShare')}
          </p>
          <Button size="sm" variant="back" onClick={onClearFilters}>
            {selectedCategoryNames.length > 0 ? 'Clear Filters' : t('home.exploreTopics')}
          </Button>
        </div>
      )}

      {/* Lazy load sentinel */}
      <MotionContainer delay={0.02}>
        <div ref={loadMoreRef} className="h-10 w-full" />
      </MotionContainer>
      {isLoadingMore && (
        <MotionContainer delay={0.04}>
          <div className="mt-2 rounded-lg bg-white/40 py-2 text-center text-sm text-gray-600 shadow-md shadow-gray-200/50 backdrop-blur-sm">
            Loading more...
          </div>
        </MotionContainer>
      )}
      {!isLoadingMore && !isLoading && !hasMoreArticles && filteredArticles.length > 0 && (
        <div className="mt-3 text-center text-sm text-gray-500" suppressHydrationWarning>
          {mounted ? t('home.noMore') : ''}
        </div>
      )}
    </div>
  );
}
