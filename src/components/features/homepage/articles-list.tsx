'use client';

import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { MotionContainer } from '@/components/layout';

// Lazy load framer-motion to reduce initial bundle size
const MotionDiv = dynamic(() => import('framer-motion').then((m) => m.motion.div), {
  ssr: false,
  loading: () => 'div' as any,
});
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Calendar, Eye, ThumbsUp, BookOpen } from 'lucide-react';
import { Article } from '@/types/shared';
import { formatDateTime } from '@/lib/utils/time-format';
import { useI18n } from '@/components/providers';

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

  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.02 },
    },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 16, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 },
    },
  } as const;

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
          <Link key={article.id} href={`/articles/${article.slug}`} className="block h-full">
            <div className="group hover:shadow-3xl shadow-brand/30 hover:shadow-brand/40 block flex h-full transform cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-2xl drop-shadow-2xl transition-all duration-500 ease-out hover:-translate-y-2 hover:scale-[1.01]">
                {/* Thumbnail (consistent height whether exists or not) */}
                <div className="relative aspect-[16/9] w-full overflow-hidden">
                  {article.thumbnail ? (
                    <Image
                      src={article.thumbnail}
                      alt={article.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      quality={70}
                      priority={index === 0}
                      fetchPriority={index === 0 ? 'high' : undefined}
                      className="object-cover transition-all duration-500 ease-out group-hover:scale-110 group-hover:brightness-110"
                    />
                  ) : (
                    <div
                      className="h-full w-full transition-all duration-500 ease-out group-hover:scale-110"
                      style={{
                        background: `linear-gradient(135deg, ${article.categories?.[0]?.color || '#6366f1'}12, #ffffff)`,
                      }}
                    />
                  )}
                  {/* Overlay effect */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100" />
                </div>

                {/* Article Header */}
                <div className="flex flex-1 flex-col p-4 pb-3 sm:p-6 sm:pb-4">
                  <div className="mb-3 flex items-center justify-between sm:mb-4">
                    <div className="flex flex-wrap gap-1">
                      {(article.categories || []).slice(0, 2).map((category) => (
                        <button
                          key={category.id}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const categoryName = category.name.toLowerCase();
                            onCategoryClick(categoryName);
                          }}
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
                      {(article.categories || []).length > 2 && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1.5 text-[10px] font-semibold text-gray-600 sm:px-3 sm:text-xs">
                          +{(article.categories || []).length - 2}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-gray-600">
                      <Calendar className="mr-1 h-3 w-3" />
                      {formatDateTime(article.createdAt)}
                    </div>
                  </div>

                  <h3 className="mb-2 line-clamp-2 flex-1 text-lg font-bold text-gray-900 sm:mb-3 sm:text-xl">
                    {article.title}
                  </h3>

                  <div className="flex items-center text-xs text-gray-700 sm:text-sm">
                    <div className="mr-2 sm:mr-3">
                      <Avatar className="h-6 w-6">
                        <AvatarImage
                          src={article.author.avatar || undefined}
                          alt={article.author.name}
                        />
                        <AvatarFallback className="text-[10px] font-bold">
                          {article.author.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <span className="font-medium">
                      {article.author.name}
                    </span>
                  </div>
                </div>

                {/* Article Footer */}
                <div className="group-hover:from-brand/5 group-hover:to-brand-700/5 bg-gray-50/50 px-4 py-3 transition-all duration-300 ease-out group-hover:bg-gradient-to-r sm:px-6 sm:py-4">
                  <div className="grid grid-cols-3 text-xs text-gray-700 sm:text-sm">
                    {/* Views - Left */}
                    <div className="flex items-center justify-center gap-1.5 transition-all duration-300 ease-out group-hover:scale-105 sm:gap-2">
                      <Eye className="group-hover:text-brand h-4 w-4 text-gray-600 transition-all duration-300 ease-out group-hover:scale-110" />
                      <span
                        className="group-hover:text-brand font-medium tabular-nums transition-colors duration-300 ease-out"
                        aria-label="views count"
                      >
                        {typeof article.views === 'number' ? article.views : 0}
                      </span>
                    </div>
                    {/* Likes - Center */}
                    <div className="flex items-center justify-center gap-1.5 transition-all duration-300 ease-out group-hover:scale-105 sm:gap-2">
                      <ThumbsUp
                        className="group-hover:text-brand h-4 w-4 text-gray-600 transition-all duration-300 ease-out group-hover:scale-110"
                        aria-hidden="true"
                      />
                      <span
                        className="group-hover:text-brand font-medium tabular-nums transition-colors duration-300 ease-out"
                        aria-label="likes count"
                      >
                        {article._count?.likes ?? 0}
                      </span>
                    </div>
                    {/* Comments - Right */}
                    <div className="flex items-center justify-center gap-1.5 transition-all duration-300 ease-out group-hover:scale-105 sm:gap-2">
                      <MessageSquare
                        className="group-hover:text-brand h-4 w-4 text-gray-600 transition-all duration-300 ease-out group-hover:scale-110"
                        aria-hidden="true"
                      />
                      <span
                        className="group-hover:text-brand font-medium tabular-nums transition-colors duration-300 ease-out"
                        aria-label="comments count"
                      >
                        {article._count?.comments ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
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
