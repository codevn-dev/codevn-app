'use client';

import { MotionContainer } from '@/components/layout';
import { Article } from '@/types/shared';
import { useI18n } from '@/components/providers';
import { ArticleCard } from './article-card';

interface FeaturedArticlesProps {
  featuredArticles: Article[];
  mounted: boolean;
  onCategoryClick: (categoryName: string) => void;
}

export function FeaturedArticles({
  featuredArticles,
  mounted,
  onCategoryClick,
}: FeaturedArticlesProps) {
  const { t } = useI18n();

  if (featuredArticles.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 sm:mb-8">
      <MotionContainer>
        <div className="rounded-2xl bg-white p-5 shadow-2xl sm:p-6 lg:p-6">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl font-bold text-gray-900 sm:text-3xl" suppressHydrationWarning>
              {mounted ? t('home.featured') : 'Featured'}
            </h2>
            <p className="text-gray-600" suppressHydrationWarning>
              {mounted ? t('home.featuredSubtitle') : 'Top articles in the last 24 hours'}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featuredArticles.map((article, index) => (
              <ArticleCard
                key={article.id}
                article={article}
                index={index}
                onCategoryClick={onCategoryClick}
                variant="featured"
              />
            ))}
          </div>
        </div>
      </MotionContainer>
    </div>
  );
}
