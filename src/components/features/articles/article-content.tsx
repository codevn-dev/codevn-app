'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { modalOverlay, modalContent } from '@/components/layout/motion-presets';
import { MotionContainer } from '@/components/layout';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Calendar,
  ArrowLeft,
  Eye,
  MoreVertical,
  EyeOff,
  Edit as EditIcon,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CodeHighlighter, ShareMenu, RelatedArticlesSidebar } from '@/features/articles';
import { CommentsSection } from '@/features/comments';
import type { CommentsSectionRef } from '@/features/comments';
import { useAuthState } from '@/hooks/use-auth-state';
import { useUIStore } from '@/stores';
import { AvatarWithDropdown } from '@/components/ui/avatar-with-dropdown';
import { Article, RoleLevel } from '@/types/shared';
import { apiDelete, apiPost, apiPut, apiGet } from '@/lib/utils/api-client';
import {
  UpdateArticleRequest,
  UpdateArticleResponse,
  DeleteArticleResponse,
} from '@/types/shared/article';
import { Category } from '@/types/shared/category';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TiptapRichTextEditor } from '@/features/articles';
import { ImageUpload } from '@/features/upload';
import { SuccessResponse } from '@/types/shared/common';
import { useI18n } from '@/components/providers';
import { ReactionRequest } from '@/types/shared/reaction';
import { formatDateTime } from '@/lib/utils/time-format';
import { v4 as uuidv4 } from 'uuid';
interface ArticleContentProps {
  article: Article;
  isPreview?: boolean;
}

export function ArticleContent({ article, isPreview = false }: ArticleContentProps) {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { isAuthenticated, user } = useAuthState();
  const { setAuthModalOpen, setAuthMode } = useUIStore();
  const [isLiked, setIsLiked] = useState((isAuthenticated && article.userHasLiked) || false);
  const [isUnliked, setIsUnliked] = useState((isAuthenticated && article.userHasUnliked) || false);
  const [likeCount, setLikeCount] = useState(article._count.likes);
  const [unlikeCount, setUnlikeCount] = useState(article._count.unlikes || 0);
  const commentsSectionRef = useRef<CommentsSectionRef>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [editForm, setEditForm] = useState({
    title: article.title,
    content: article.content,
    slug: article.slug,
    thumbnail: article.thumbnail || '',
    categoryId: article.category.id,
    published: article.published,
  });

  // Ensure view starts at top when opening an article
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, []);

  // Precompute dynamic dwell threshold (2 → 10s) based on article length
  const dwellThreshold = useMemo(() => {
    try {
      const text = (article.content || '')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-zA-Z#0-9]+;/g, ' ');
      const words = text
        .split(/\s+/)
        .map((w) => w.trim())
        .filter(Boolean).length;
      if (words <= 200) return 2;
      if (words <= 400) return 4;
      if (words <= 800) return 7;
      return 10;
    } catch {
      return 7;
    }
  }, [article.content]);

  // Track validated view: unique per session/article, dwell >= dwellThreshold OR scroll >= 30%
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Do not track in preview mode
    if (isPreview) return;

    // Session id in localStorage
    const KEY = 'cvn_session_id_v1';
    let sessionId = '';
    try {
      sessionId = localStorage.getItem(KEY) || '';
      if (!sessionId) {
        sessionId = uuidv4();
        localStorage.setItem(KEY, sessionId);
      }
    } catch {}

    // Per-article guard to avoid multiple sends this visit
    const sentKey = `cvn_view_sent_${article.id}`;
    if (sessionStorage.getItem(sentKey) === '1') return;

    let maxScroll = 0;
    let dwellSeconds = 0;
    let sent = false;
    const scrollThreshold = 30; // percent

    // Check if content fits in one page (from title to before comments)
    const checkIfContentFitsInOnePage = () => {
      const articleRoot = document.querySelector('[data-article-root]');
      if (!articleRoot) return false;

      const titleElement = articleRoot.querySelector('h1');
      const commentsSection =
        articleRoot.querySelector('[data-comments-section]') ||
        articleRoot.querySelector('h2, h3')?.textContent?.includes('comment')
          ? articleRoot.querySelector('h2, h3')
          : null;

      if (!titleElement) return false;

      const titleTop = titleElement.getBoundingClientRect().top + window.scrollY;
      const contentBottom = commentsSection
        ? commentsSection.getBoundingClientRect().top + window.scrollY
        : articleRoot.getBoundingClientRect().bottom + window.scrollY;

      const contentHeight = contentBottom - titleTop;
      const viewportHeight = window.innerHeight;

      // If content height is less than viewport height, it fits in one page
      return contentHeight <= viewportHeight;
    };

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop || 0;
      const scrollHeight = doc.scrollHeight - doc.clientHeight || 1;
      const percent = Math.max(0, Math.min(100, Math.round((scrollTop / scrollHeight) * 100)));
      if (percent > maxScroll) maxScroll = percent;
    };

    const interval = window.setInterval(() => {
      dwellSeconds += 1;
      trySend();
    }, 1000);

    const trySend = () => {
      if (sent) return;

      // Check if content fits in one page
      const fitsInOnePage = checkIfContentFitsInOnePage();

      // If content fits in one page, only check dwell time
      // Otherwise, check both dwell time and scroll depth
      const shouldSend = fitsInOnePage
        ? dwellSeconds >= dwellThreshold
        : dwellSeconds >= dwellThreshold || maxScroll >= scrollThreshold;

      if (shouldSend) {
        sent = true;
        sessionStorage.setItem(sentKey, '1');
        apiPost(`/api/articles/${article.id}/track-view`, {
          sessionId,
        }).catch(() => {});
        cleanup();
      }
    };

    const cleanup = () => {
      window.removeEventListener('scroll', onScroll, { capture: false } as any);
      window.clearInterval(interval);
    };

    // Only add scroll listener if content might not fit in one page
    const fitsInOnePage = checkIfContentFitsInOnePage();
    if (!fitsInOnePage) {
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    // Fallback: if user is authenticated, send immediately once
    if (isAuthenticated) {
      trySend();
    }

    return cleanup;
  }, [article.id, isAuthenticated, isPreview, dwellThreshold]);

  // Derive effective UI states that never show as active when logged out
  const likedEffective = isAuthenticated ? isLiked : false;
  const unlikedEffective = isAuthenticated ? isUnliked : false;

  // Sync reaction state with auth status: if logged out, we cannot know per-user state -> reset to false
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLiked(false);
      setIsUnliked(false);
    } else {
      setIsLiked(!!article.userHasLiked);
      setIsUnliked(!!article.userHasUnliked);
    }
  }, [isAuthenticated, article.userHasLiked, article.userHasUnliked]);

  const handleReaction = async (action: 'like' | 'unlike') => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      setAuthMode('signin');
      setAuthModalOpen(true);
      return;
    }

    try {
      const shouldDelete = (action === 'like' && isLiked) || (action === 'unlike' && isUnliked);

      if (shouldDelete) {
        await apiDelete<SuccessResponse>(`/api/articles/${article.id}/reaction`);
      } else {
        await apiPost<SuccessResponse>(`/api/articles/${article.id}/reaction`, {
          action,
        } as ReactionRequest);
      }
      if (action === 'like') {
        if (isLiked) {
          // Remove like
          setIsLiked(false);
          setLikeCount((prev) => prev - 1);
        } else {
          // Add like, remove unlike if exists
          if (isUnliked) {
            setIsUnliked(false);
            setUnlikeCount((prev) => prev - 1);
          }
          setIsLiked(true);
          setLikeCount((prev) => prev + 1);
        }
      } else if (action === 'unlike') {
        if (isUnliked) {
          // Remove unlike
          setIsUnliked(false);
          setUnlikeCount((prev) => prev - 1);
        } else {
          // Add unlike, remove like if exists
          if (isLiked) {
            setIsLiked(false);
            setLikeCount((prev) => prev - 1);
          }
          setIsUnliked(true);
          setUnlikeCount((prev) => prev + 1);
        }
      }
    } catch {
      // Error handled silently
    }
  };

  const handleLike = () => handleReaction('like');
  const handleUnlike = () => handleReaction('unlike');

  const handleCommentClick = () => {
    commentsSectionRef.current?.scrollToCommentForm();
  };

  const canManage = isAuthenticated && user?.id === (article as any)?.author?.id;

  const handleUnpublish = async () => {
    try {
      await apiPut<UpdateArticleResponse>('/api/articles', {
        id: (article as any).id,
        published: false,
      } as UpdateArticleRequest);
      window.location.href = `/articles/${article.slug}?preview=true`;
    } catch {}
  };

  const handlePublish = async () => {
    try {
      await apiPut<UpdateArticleResponse>('/api/articles', {
        id: (article as any).id,
        published: true,
      } as UpdateArticleRequest);
      window.location.href = `/articles/${article.slug}`;
    } catch {}
  };

  const handleEdit = () => {
    // Open inline modal on article page
    setEditForm({
      title: article.title,
      content: article.content,
      slug: article.slug,
      thumbnail: article.thumbnail || '',
      categoryId: article.category.id,
      published: article.published,
    });
    setIsEditOpen(true);
  };

  // Load categories when opening edit modal
  useEffect(() => {
    if (!isEditOpen) return;
    (async () => {
      try {
        const list = await apiGet<Category[]>('/api/categories');
        setCategories(list);
      } catch {
        setCategories([]);
      }
    })();
  }, [isEditOpen]);

  const handleSaveEdit = async () => {
    try {
      await apiPut<UpdateArticleResponse>('/api/articles', {
        id: (article as any).id,
        title: editForm.title,
        content: editForm.content,
        slug: editForm.slug,
        thumbnail: editForm.thumbnail,
        categoryId: editForm.categoryId,
        published: editForm.published,
      } as UpdateArticleRequest);
      setIsEditOpen(false);
      window.location.reload();
    } catch {}
  };

  const handleDelete = async () => {
    if (!confirm('Delete this article? This action cannot be undone.')) return;
    try {
      await apiDelete<DeleteArticleResponse>(`/api/articles?id=${(article as any).id}`);
      window.location.href = '/articles';
    } catch {}
  };

  return (
    <div data-article-root>
      <div className="py-8">
        <div className="relative mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
          {/* Related sidebar on xl+ */}
          <div className="hidden xl:absolute xl:top-0 xl:right-[-320px] xl:block xl:w-[320px] xl:max-w-[360px] xl:min-w-[320px]">
            <RelatedArticlesSidebar articleId={article.id} />
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-2xl shadow-gray-400/80 sm:p-6">
            {isPreview && (
              <div className="-m-6 mb-6 rounded-t-2xl border-b border-yellow-200 bg-yellow-100 px-6 py-3">
                <div className="flex items-center text-sm font-medium text-yellow-800">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview Mode - This article is not published yet
                </div>
              </div>
            )}
            <div className="pb-4">
              <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
                <Button asChild variant="back" size="sm">
                  <Link href="/" className="flex items-center">
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    <span suppressHydrationWarning>{mounted ? t('common.back') : ''}</span>
                  </Link>
                </Button>
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shadow-brand/30 h-8 w-8 rounded-full p-0 shadow-2xl hover:bg-gray-50"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="shadow-brand/40 w-48 rounded-2xl bg-white/95 shadow-2xl drop-shadow-2xl backdrop-blur-md"
                      align="end"
                    >
                      {isPreview ? (
                        <>
                          <DropdownMenuItem onClick={handlePublish} className="cursor-pointer">
                            <Eye className="mr-2 h-4 w-4" /> {t('articles.menu.publish')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                            <EditIcon className="mr-2 h-4 w-4" /> {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={handleDelete}
                            className="cursor-pointer text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> {t('common.delete')}
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          <DropdownMenuItem onClick={handleUnpublish} className="cursor-pointer">
                            <EyeOff className="mr-2 h-4 w-4" /> {t('articles.menu.unpublish')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                            <EditIcon className="mr-2 h-4 w-4" /> {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={handleDelete}
                            className="cursor-pointer text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> {t('common.delete')}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <div>
                <div className="mb-4">
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
                </div>

                <h1 className="mb-3 text-2xl font-bold text-gray-900 sm:mb-4 sm:text-3xl">
                  {article.title}
                </h1>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-start space-x-2">
                    <AvatarWithDropdown
                      user={{
                        id: article.author.id,
                        name: article.author.name,
                        email: '', // Email not available in new API
                        avatar: article.author.avatar || undefined,
                        role: RoleLevel.member,
                        createdAt: new Date().toISOString(),
                      }}
                      size="lg"
                      className="mt-0.5"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-900">{article.author.name}</span>
                      </div>
                      <div
                        className="flex items-center text-xs text-gray-500"
                        suppressHydrationWarning
                      >
                        <Calendar className="mr-1 h-3 w-3" />
                        {formatDateTime(article.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="text-brand flex items-center text-sm">
                    <Eye className="mr-1 h-4 w-4" />
                    {typeof article.views === 'number' ? article.views : 0}
                  </span>
                  {isPreview ? (
                    <>
                      <span className="text-brand flex items-center text-sm">
                        <ThumbsUp className="mr-1 h-4 w-4" />
                        {likeCount}
                      </span>
                      <span className="text-brand flex items-center text-sm">
                        <ThumbsDown className="mr-1 h-4 w-4" />
                        {unlikeCount}
                      </span>
                      <span className="text-brand flex items-center text-sm">
                        <MessageSquare className="mr-1 h-4 w-4" />
                        {article._count.comments}
                      </span>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="back"
                        size="sm"
                        onClick={handleLike}
                        className={`transition-colors duration-200 ${
                          likedEffective
                            ? 'border-emerald-500 bg-emerald-50/50 text-emerald-600 hover:border-emerald-600 hover:bg-emerald-50'
                            : 'hover:border-emerald-500 hover:bg-emerald-50/30 hover:text-emerald-600'
                        }`}
                      >
                        <ThumbsUp
                          className={`mr-1 h-4 w-4 transition-colors duration-200 ${
                            likedEffective ? 'fill-current text-emerald-600' : 'text-brand'
                          }`}
                        />
                        {likeCount}
                      </Button>
                      <Button
                        variant="back"
                        size="sm"
                        onClick={handleUnlike}
                        className={`transition-colors duration-200 ${
                          unlikedEffective
                            ? 'border-rose-500 bg-rose-50/50 text-rose-600 hover:border-rose-600 hover:bg-rose-50'
                            : 'hover:border-rose-500 hover:bg-rose-50/30 hover:text-rose-600'
                        }`}
                      >
                        <ThumbsDown
                          className={`mr-1 h-4 w-4 transition-colors duration-200 ${
                            unlikedEffective ? 'fill-current text-rose-600' : 'text-brand'
                          }`}
                        />
                        {unlikeCount}
                      </Button>
                      <Button
                        variant="back"
                        size="sm"
                        onClick={handleCommentClick}
                        className="cursor-pointer hover:border-blue-300 hover:bg-blue-50"
                      >
                        <MessageSquare className="mr-1 h-4 w-4" />
                        {article._count.comments}
                      </Button>
                      <div className="ml-auto">
                        <ShareMenu title={article.title} size="sm" />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <MotionContainer delay={0.05} className="mt-6 pt-0 sm:mt-8">
                <CodeHighlighter
                  content={article.content}
                  className="leading-relaxed text-gray-700"
                />
              </MotionContainer>

              <div className="my-6 border-t border-gray-200 sm:my-8" />

              <div className="mt-6 pt-0 sm:mt-8 sm:pt-0" data-comments-section>
                <CommentsSection
                  ref={commentsSectionRef}
                  articleId={article.id}
                  commentCount={article._count.comments}
                  disableForm={isPreview}
                />
              </div>

              {/* Related Articles for tablet/mobile - shown below comments */}
              <div className="mt-8 xl:hidden">
                <RelatedArticlesSidebar articleId={article.id} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isEditOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
            variants={modalOverlay}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <motion.div
              className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-2xl"
              variants={modalContent}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Edit Article</h2>
                <Button variant="back" size="sm" onClick={() => setIsEditOpen(false)}>
                  Close
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title *</label>
                    <Input
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Slug *</label>
                    <Input
                      value={editForm.slug}
                      onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Thumbnail</label>
                  {editForm.thumbnail ? (
                    <div className="space-y-2">
                      <div className="relative w-full max-w-sm">
                        <img
                          src={editForm.thumbnail}
                          alt="Thumbnail"
                          className="h-40 w-full rounded-lg object-cover"
                        />
                        <Button
                          type="button"
                          variant="back"
                          size="sm"
                          onClick={() => setEditForm({ ...editForm, thumbnail: '' })}
                          className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                        >
                          Remove
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="back"
                        onClick={() => setShowImageUpload(true)}
                        className="w-full max-w-sm"
                      >
                        Change Image
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full max-w-sm">
                      <button
                        type="button"
                        onClick={() => setShowImageUpload(true)}
                        className="group flex h-40 w-full flex-col items-center justify-center space-y-2 rounded-lg bg-white transition-colors"
                      >
                        Upload image
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Category *</label>
                  <Select
                    value={editForm.categoryId || 'placeholder'}
                    onValueChange={(value) =>
                      setEditForm({ ...editForm, categoryId: value === 'placeholder' ? '' : value })
                    }
                  >
                    <SelectTrigger className="focus:ring-brand/20 focus:ring-2">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="placeholder" disabled>
                        Select a category
                      </SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Content *</label>
                  <TiptapRichTextEditor
                    value={editForm.content}
                    onChange={(value) => setEditForm({ ...editForm, content: value })}
                    placeholder="Write your article content here..."
                    className="min-h-[400px]"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="published-detail"
                    checked={editForm.published}
                    onChange={(e) => setEditForm({ ...editForm, published: e.target.checked })}
                    className="text-brand focus:ring-brand h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="published-detail" className="text-sm font-medium">
                    Published
                  </label>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="back" onClick={() => setIsEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit}>Save changes</Button>
                </div>
              </div>

              {showImageUpload && (
                <ImageUpload
                  onImageUploaded={(imageUrl) => {
                    setEditForm({ ...editForm, thumbnail: imageUrl });
                    setShowImageUpload(false);
                  }}
                  onClose={() => setShowImageUpload(false)}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
