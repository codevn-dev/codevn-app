'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { CodeHighlighter } from '@/features/articles';
import { CommentsSection } from '@/features/comments';
import type { CommentsSectionRef } from '@/features/comments';
import { useAuthState } from '@/hooks/use-auth-state';
import { useUIStore } from '@/stores';
import { AvatarWithDropdown } from '@/components/ui/avatar-with-dropdown';
import { Article } from '@/types/shared';
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
import { ReactionRequest } from '@/types/shared/article';

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
      window.location.href = '/';
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
    <>
      <div className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-6 shadow-2xl shadow-gray-400/80">
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
                      <DropdownMenuItem onClick={handleUnpublish} className="cursor-pointer">
                        <EyeOff className="mr-2 h-4 w-4" /> Unpublish
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                        <EditIcon className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleDelete}
                        className="cursor-pointer text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <div className="mb-4">
                <Badge className="text-white" style={{ backgroundColor: article.category.color }}>
                  {article.category.name}
                </Badge>
              </div>

              <h1 className="mb-3 text-2xl font-bold text-gray-900 sm:mb-4 sm:text-3xl">
                {article.title}
              </h1>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-start space-x-2">
                    <AvatarWithDropdown
                      user={{
                        id: article.author.id,
                        name: article.author.name,
                        email: article.author.email,
                        avatar: article.author.avatar || undefined,
                        role: 'user' as const,
                        createdAt: new Date().toISOString(),
                      }}
                      size="lg"
                      className="mt-0.5"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-900">{article.author.name}</span>
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="mr-1 h-3 w-3" />
                        {new Date(article.createdAt).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {typeof article.views === 'number' && (
                    <span className="flex items-center text-sm text-gray-600">
                      <Eye className="mr-1 h-4 w-4" />
                      {article.views}
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLike}
                    className={`transition-colors duration-200 ${
                      likedEffective
                        ? 'border-green-600 text-green-600 hover:border-green-700 hover:bg-green-50'
                        : 'hover:border-green-600 hover:text-green-600'
                    }`}
                  >
                    <ThumbsUp
                      className={`mr-1 h-4 w-4 transition-colors duration-200 ${
                        likedEffective ? 'fill-current text-green-600' : 'text-gray-500'
                      }`}
                    />
                    {likeCount}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUnlike}
                    className={`transition-colors duration-200 ${
                      unlikedEffective
                        ? 'border-red-600 text-red-600 hover:border-red-700 hover:bg-red-50'
                        : 'hover:border-red-600 hover:text-red-600'
                    }`}
                  >
                    <ThumbsDown
                      className={`mr-1 h-4 w-4 transition-colors duration-200 ${
                        unlikedEffective ? 'fill-current text-red-600' : 'text-gray-500'
                      }`}
                    />
                    {unlikeCount}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCommentClick}
                    className="cursor-pointer hover:border-blue-300 hover:bg-blue-50"
                  >
                    <MessageSquare className="mr-1 h-4 w-4" />
                    {article._count.comments}
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-0">
              <CodeHighlighter
                content={article.content}
                className="leading-relaxed text-gray-700"
              />
            </div>

            <div className="border-brand/20 mt-6 border-t pt-4 sm:mt-8 sm:pt-6">
              <CommentsSection
                ref={commentsSectionRef}
                articleId={article.id}
                commentCount={article._count.comments}
              />
            </div>
          </div>
        </div>
      </div>

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit Article</h2>
              <Button variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
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
                        variant="outline"
                        size="sm"
                        onClick={() => setEditForm({ ...editForm, thumbnail: '' })}
                        className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                      >
                        Remove
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
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
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
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
          </div>
        </div>
      )}
    </>
  );
}
