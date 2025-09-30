'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { MotionContainer } from '@/components/layout';
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

      <motion.div
        variants={containerVariants}
        initial={
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? undefined
            : 'hidden'
        }
        animate={
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? undefined
            : 'visible'
        }
        className="grid grid-cols-1 gap-3 sm:gap-5 md:grid-cols-2 lg:grid-cols-3"
        style={{ contentVisibility: 'auto', containIntrinsicSize: '1px 400px' }}
      >
        {filteredArticles.map((article, index) => (
          <motion.div
            key={article.id}
            variants={itemVariants}
            whileHover={
              typeof window !== 'undefined' &&
              window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? undefined
                : {
                    y: -12,
                    scale: 1.02,
                    transition: { type: 'spring', stiffness: 380, damping: 28 },
                  }
            }
            whileTap={
              typeof window !== 'undefined' &&
              window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? undefined
                : { scale: 0.99 }
            }
          >
            <Link href={`/articles/${article.slug}`} className="block h-full">
              <div className="group block flex h-full transform cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-xl transition-all duration-500 ease-out hover:-translate-y-4 hover:scale-[1.02]">
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
                        background: `linear-gradient(135deg, ${article.category.color}12, #ffffff)`,
                      }}
                    />
                  )}
                  {/* Overlay effect */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100" />
                </div>

                {/* Article Header */}
                <div className="flex flex-1 flex-col p-4 pb-3 sm:p-6 sm:pb-4">
                  <div className="mb-3 flex items-center justify-between sm:mb-4">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const categoryName = article.category.name.toLowerCase();
                        onCategoryClick(categoryName);
                      }}
                      className="inline-flex items-center rounded-full px-2.5 py-1.5 text-[10px] font-semibold sm:px-3 sm:text-xs"
                      style={{
                        backgroundColor: `${article.category.color}15`,
                        color: article.category.color,
                      }}
                    >
                      <div
                        className="mr-2 h-2 w-2 rounded-full"
                        style={{ backgroundColor: article.category.color }}
                      />
                      {article.category.name}
                    </button>
                    <div className="flex items-center text-xs text-gray-600">
                      <Calendar className="mr-1 h-3 w-3" />
                      {formatDateTime(article.createdAt)}
                    </div>
                  </div>

                  <h3 className="group-hover:text-brand mb-2 line-clamp-2 flex-1 text-lg font-bold text-gray-900 transition-all duration-300 ease-out group-hover:scale-[1.02] sm:mb-3 sm:text-xl">
                    {article.title}
                  </h3>

                  <div className="flex items-center text-xs text-gray-700 transition-all duration-300 ease-out group-hover:translate-x-1 sm:text-sm">
                    <div className="mr-2 sm:mr-3">
                      <Avatar className="h-6 w-6 transition-all duration-300 ease-out group-hover:scale-110 group-hover:shadow-lg">
                        <AvatarImage
                          src={article.author.avatar || undefined}
                          alt={article.author.name}
                        />
                        <AvatarFallback className="text-[10px] font-bold">
                          {article.author.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <span className="group-hover:text-brand font-medium transition-colors duration-300 ease-out">
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
          </motion.div>
        ))}
      </motion.div>

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
