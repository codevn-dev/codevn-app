'use client';

import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { MotionContainer } from '@/components/layout';
const MotionDiv = dynamic(() => import('framer-motion').then((m) => m.motion.div), {
  ssr: false,
  loading: () => 'div' as any,
});
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Calendar, Eye, ThumbsUp } from 'lucide-react';
import { Article } from '@/types/shared';
import { formatDateTime } from '@/lib/utils/time-format';
import { useI18n } from '@/components/providers';

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

  // Debug logging
  console.log('FeaturedArticles received:', featuredArticles);
  featuredArticles.forEach((article, index) => {
    console.log(`Article ${index}:`, article);
    console.log(`Article ${index} categories:`, article.categories);
    if (article.categories) {
      article.categories.forEach((cat, catIndex) => {
        console.log(`Article ${index} category ${catIndex}:`, cat);
      });
    }
  });

  if (featuredArticles.length === 0) {
    return null;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 24,
      },
    },
  };

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
              <Link key={article.id} href={`/articles/${article.slug}`} className="block h-full">
                <div className="group hover:shadow-3xl shadow-brand/30 hover:shadow-brand/40 block flex h-full transform cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-2xl drop-shadow-2xl transition-all duration-500 ease-out hover:-translate-y-2 hover:scale-[1.01]">
                  <div className="relative aspect-[16/9] w-full overflow-hidden">
                    {article.thumbnail ? (
                      <Image
                        src={article.thumbnail}
                        alt={article.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        priority={index === 0}
                        fetchPriority={index === 0 ? 'high' : undefined}
                        quality={70}
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
                  <div className="flex flex-1 flex-col p-4 pb-3 sm:p-6 sm:pb-4">
                    <div className="mb-3 flex items-center justify-between sm:mb-4">
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(article.categories) && article.categories.slice(0, 2).filter(category => 
                          category && 
                          typeof category === 'object' && 
                          category.id && 
                          category.color && 
                          category.name &&
                          typeof category.color === 'string' &&
                          typeof category.name === 'string'
                        ).map((category) => (
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
                      <span className="font-medium">{article.author.name}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50/50 px-4 py-3 sm:px-6 sm:py-4">
                    <div className="grid grid-cols-3 text-xs text-gray-700 sm:text-sm">
                      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                        <Eye className="h-4 w-4 text-gray-600" />
                        <span className="font-medium tabular-nums">
                          {typeof article.views === 'number' ? article.views : 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                        <ThumbsUp className="h-4 w-4 text-gray-600" />
                        <span className="font-medium tabular-nums">{article._count.likes}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                        <MessageSquare className="h-4 w-4 text-gray-600" />
                        <span className="font-medium tabular-nums">{article._count.comments}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </MotionContainer>
    </div>
  );
}
