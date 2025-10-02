'use client';

import Link from 'next/link';
import Image from 'next/image';
import { nextCloudflareLoader, ARTICLE_IMAGE_SIZES } from '@/lib/utils/images';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Calendar, Eye, ThumbsUp } from 'lucide-react';
import { Article } from '@/types/shared';
import { formatDate } from '@/lib/utils/time-format';

interface ArticleCardProps {
  article: Article;
  index?: number;
  onCategoryClick: (categoryName: string) => void;
  variant?: 'featured' | 'list';
}

export function ArticleCard({
  article,
  index = 0,
  onCategoryClick,
  variant = 'list',
}: ArticleCardProps) {
  return (
    <Link key={article.id} href={`/articles/${article.slug}`} className="block h-full">
      <div className="group hover:shadow-3xl shadow-brand/30 hover:shadow-brand/40 block flex h-full transform cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-2xl drop-shadow-2xl transition-all duration-500 ease-out hover:-translate-y-2 hover:scale-[1.01]">
        {/* Thumbnail */}
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          {article.thumbnail ? (
            <Image
              src={article.thumbnail}
              alt={article.title}
              fill
              sizes={ARTICLE_IMAGE_SIZES}
              priority={index === 0}
              fetchPriority={index === 0 ? 'high' : undefined}
              quality={75}
              loader={nextCloudflareLoader}
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100" />
        </div>

        {/* Article Content */}
        <div className="flex flex-1 flex-col p-4 pb-3 sm:p-6 sm:pb-4">
          {/* Categories and Date */}
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <div className="flex flex-wrap gap-1">
              {Array.isArray(article.categories) &&
                article.categories
                  .slice(0, 2)
                  .filter(
                    (category) =>
                      category &&
                      typeof category === 'object' &&
                      category.id &&
                      category.color &&
                      category.name &&
                      typeof category.color === 'string' &&
                      typeof category.name === 'string'
                  )
                  .map((category) => (
                    <button
                      key={category.id}
                      className="inline-flex items-center rounded-full px-2.5 py-1.5 text-[10px] font-semibold sm:px-3 sm:text-xs"
                      style={{
                        backgroundColor: `${category.color}15`,
                        color: category.color,
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const name = category.name.toLowerCase();
                        onCategoryClick(name);
                      }}
                    >
                      <div
                        className="mr-2 h-2 w-2 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </button>
                  ))}
              {Array.isArray(article.categories) && article.categories.length > 2 && (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1.5 text-[10px] font-semibold text-gray-600 sm:px-3 sm:text-xs">
                  +{article.categories.length - 2}
                </span>
              )}
            </div>
            <div className="flex items-center text-xs text-gray-600">
              <Calendar className="mr-1 h-3 w-3" />
              {formatDate(article.createdAt)}
            </div>
          </div>

          {/* Title */}
          <h3
            className="group-hover:text-brand mb-2 line-clamp-2 flex-1 text-lg font-bold text-gray-900 transition-colors duration-300 sm:mb-3 sm:text-xl"
            suppressHydrationWarning
          >
            {article.title}
          </h3>

          {/* Author */}
          <div
            className="group-hover:text-brand flex items-center text-xs text-gray-700 transition-colors duration-300 sm:text-sm"
            suppressHydrationWarning
          >
            <div className="mr-2 sm:mr-3">
              <Avatar className="h-6 w-6 transition-transform duration-300 group-hover:scale-110">
                <AvatarImage src={article.author.avatar || undefined} alt={article.author.name} />
                <AvatarFallback className="text-[10px] font-bold">
                  {article.author.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
            <span className="font-medium">{article.author.name}</span>
          </div>
        </div>

        {/* Article Footer - Stats */}
        <div
          className={`px-4 py-3 sm:px-6 sm:py-4 ${
            variant === 'list'
              ? 'group-hover:from-brand/5 group-hover:to-brand-700/5 bg-gray-50/50 transition-all duration-300 ease-out group-hover:bg-gradient-to-r'
              : 'bg-gray-50/50'
          }`}
        >
          <div className="grid grid-cols-3 text-xs text-gray-700 sm:text-sm">
            {/* Views */}
            <div
              className={`flex items-center justify-center gap-1.5 sm:gap-2 ${
                variant === 'list'
                  ? 'transition-all duration-300 ease-out group-hover:scale-105'
                  : ''
              }`}
            >
              <Eye
                className={`h-4 w-4 text-gray-600 ${
                  variant === 'list'
                    ? 'group-hover:text-brand transition-all duration-300 ease-out group-hover:scale-110'
                    : ''
                }`}
              />
              <span
                className={`font-medium tabular-nums ${
                  variant === 'list'
                    ? 'group-hover:text-brand transition-colors duration-300 ease-out'
                    : ''
                }`}
              >
                {typeof article.views === 'number' ? article.views : 0}
              </span>
            </div>

            {/* Likes */}
            <div
              className={`flex items-center justify-center gap-1.5 sm:gap-2 ${
                variant === 'list'
                  ? 'transition-all duration-300 ease-out group-hover:scale-105'
                  : ''
              }`}
            >
              <ThumbsUp
                className={`h-4 w-4 text-gray-600 ${
                  variant === 'list'
                    ? 'group-hover:text-brand transition-all duration-300 ease-out group-hover:scale-110'
                    : ''
                }`}
              />
              <span
                className={`font-medium tabular-nums ${
                  variant === 'list'
                    ? 'group-hover:text-brand transition-colors duration-300 ease-out'
                    : ''
                }`}
              >
                {article._count?.likes || 0}
              </span>
            </div>

            {/* Comments */}
            <div
              className={`flex items-center justify-center gap-1.5 sm:gap-2 ${
                variant === 'list'
                  ? 'transition-all duration-300 ease-out group-hover:scale-105'
                  : ''
              }`}
            >
              <MessageSquare
                className={`h-4 w-4 text-gray-600 ${
                  variant === 'list'
                    ? 'group-hover:text-brand transition-all duration-300 ease-out group-hover:scale-110'
                    : ''
                }`}
              />
              <span
                className={`font-medium tabular-nums ${
                  variant === 'list'
                    ? 'group-hover:text-brand transition-colors duration-300 ease-out'
                    : ''
                }`}
              >
                {article._count?.comments || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
