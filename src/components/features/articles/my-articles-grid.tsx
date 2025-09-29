'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  MoreVertical,
  Eye,
  EyeOff,
  ExternalLink,
  Edit,
  Trash2,
  ThumbsUp,
  MessageSquare,
} from 'lucide-react';
import { Article } from '@/types/shared';
import { formatDateTime } from '@/lib/utils/time-format';
import { useI18n } from '@/components/providers';

interface MyArticlesGridProps {
  articles: Article[];
  userId?: string;
  openDropdown: string | null;
  onToggleDropdown: (id: string) => void;
  onCloseDropdown: () => void;
  onTogglePublish: (article: Article) => void;
  onPreview: (article: Article) => void;
  onEdit: (article: Article) => void;
  onDeleteRequest: (article: Article) => void;
}

export function MyArticlesGrid({
  articles,
  userId,
  openDropdown,
  onToggleDropdown,
  onCloseDropdown,
  onTogglePublish,
  onPreview,
  onEdit,
  onDeleteRequest,
}: MyArticlesGridProps) {
  const { t } = useI18n();

  const containerVariants = {
    hidden: { opacity: 1 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
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
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 gap-3 sm:gap-5 md:grid-cols-2 lg:grid-cols-3"
    >
      {articles.map((article, index) => (
        <motion.div
          key={`article-${index}-${String(article.id).slice(0, 8)}`}
          variants={itemVariants}
          className="block h-full"
        >
          <div className="shadow-brand/30 block flex h-full flex-col rounded-2xl bg-white shadow-2xl drop-shadow-2xl">
            <div className="relative aspect-[16/9] w-full overflow-hidden">
              {article.thumbnail ? (
                <img
                  src={article.thumbnail}
                  alt={article.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    background: `linear-gradient(135deg, ${article.category.color}12, #ffffff)`,
                  }}
                />
              )}
            </div>

            <div className="flex flex-1 flex-col p-4 pb-3 sm:p-6 sm:pb-4">
              <div className="mb-3 flex items-center justify-between sm:mb-4">
                <button
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
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-xs text-gray-600">
                    <Calendar className="mr-1 h-3 w-3" />
                    {formatDateTime(article.createdAt)}
                  </div>
                  <div className="dropdown-container relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleDropdown(String(article.id));
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>

                    {openDropdown === article.id && (
                      <div className="dropdown-container shadow-brand/40 absolute top-8 right-0 z-50 w-48 rounded-2xl bg-white/95 py-1 shadow-2xl drop-shadow-2xl backdrop-blur-md">
                        <div
                          onClick={() => {
                            onTogglePublish(article);
                            onCloseDropdown();
                          }}
                          className="flex w-full cursor-pointer items-center px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50"
                        >
                          {article.published ? (
                            <>
                              <EyeOff className="mr-2 h-4 w-4" />
                              {t('articles.menu.unpublish')}
                            </>
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              {t('articles.menu.publish')}
                            </>
                          )}
                        </div>

                        {userId && article.author.id === userId && (
                          <div
                            onClick={() => {
                              if (article.published) {
                                window.open(`/articles/${article.slug}`, '_blank');
                              } else {
                                onPreview(article);
                              }
                              onCloseDropdown();
                            }}
                            className="flex w-full cursor-pointer items-center px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            {article.published
                              ? t('articles.menu.view')
                              : t('articles.menu.preview')}
                          </div>
                        )}

                        <div
                          onClick={() => {
                            onEdit(article);
                            onCloseDropdown();
                          }}
                          className="flex w-full cursor-pointer items-center px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          {t('common.edit')}
                        </div>

                        <div
                          onClick={() => {
                            onDeleteRequest(article);
                            onCloseDropdown();
                          }}
                          className="flex w-full cursor-pointer items-center px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('common.delete')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="line-clamp-2 flex-1 text-lg font-bold text-gray-900 sm:text-xl">
                  {article.title}
                </h3>
                <Badge
                  variant={article.published ? 'default' : 'secondary'}
                  className={article.published ? 'bg-brand hover:bg-brand-600 text-white' : ''}
                >
                  {article.published ? t('articles.published') : t('articles.draft')}
                </Badge>
              </div>

              <div className="flex items-center text-xs text-gray-700 sm:text-sm">
                <div className="from-brand to-brand-700 mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold text-white sm:mr-3 sm:text-xs">
                  {article.author.name?.charAt(0).toUpperCase() || '?'}
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
        </motion.div>
      ))}
    </motion.div>
  );
}
