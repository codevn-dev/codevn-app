'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoadingScreen } from '@/components/ui/loading-screen';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  FileText,
  Edit,
  Trash2,
  Search,
  ArrowUpDown,
  Eye,
  EyeOff,
  Calendar,
  ExternalLink,
  Upload,
  X,
  MoreVertical,
  ThumbsUp,
  MessageSquare,
} from 'lucide-react';
import { useAuthState } from '@/hooks/use-auth-state';
import { ClientOnly, MotionContainer } from '@/components/layout';
import { motion } from 'framer-motion';
import { TiptapRichTextEditor, CodeHighlighter } from '@/features/articles';
import { ImageUpload } from '@/features/upload';
import { formatDateTime } from '@/lib/utils/time-format';
import {
  Article,
  Category,
  ArticleListResponse,
  CreateArticleResponse,
  UpdateArticleResponse,
  DeleteArticleResponse,
  CreateArticleRequest,
  UpdateArticleRequest,
} from '@/types/shared';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/utils/api-client';
import { useI18n } from '@/components/providers';

function ArticlesContent() {
  const { t } = useI18n();
  const { user, isAuthenticated, isLoading } = useAuthState();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Article | null>(null);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'createdAt' | 'updatedAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 9,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [articleForm, setArticleForm] = useState({
    title: '',
    content: '',
    slug: '',
    thumbnail: '',
    categoryId: '',
    published: false,
  });

  // Create stable reference for user to prevent unnecessary re-renders
  const stableUser = useMemo(() => user, [user]);

  // Disable Create when required fields are missing
  const isCreateDisabled = useMemo(() => {
    return (
      !articleForm.title.trim() ||
      !articleForm.slug.trim() ||
      !articleForm.content.trim() ||
      !articleForm.categoryId.trim()
    );
  }, [articleForm.title, articleForm.slug, articleForm.content, articleForm.categoryId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Check if click is outside dropdown
      if (openDropdown && !target.closest('.dropdown-container')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  // Fetch categories for dropdown
  const fetchCategories = useCallback(async () => {
    try {
      const categoriesData = await apiGet<Category[]>('/api/categories');
      setCategories(categoriesData);
    } catch {
      // Error handled silently
    }
  }, []);

  // Fetch articles function - only user's own articles
  const fetchArticles = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({
        search: searchTerm,
        sortBy: sortBy,
        sortOrder: sortOrder,
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        status: statusFilter,
        categoryId: categoryFilter,
        authorId: user.id, // Only fetch user's own articles
      });

      const data = await apiGet<ArticleListResponse>(`/api/articles?${params}`);
      setArticles((prev) => (currentPage === 1 ? data.articles : [...prev, ...data.articles]));
      setPagination({
        currentPage: data.pagination.page,
        totalPages: data.pagination.totalPages,
        totalItems: data.pagination.total,
        itemsPerPage: data.pagination.limit,
        hasNextPage: data.pagination.hasNext,
        hasPrevPage: data.pagination.hasPrev,
      });
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [
    user,
    searchTerm,
    sortBy,
    sortOrder,
    currentPage,
    itemsPerPage,
    statusFilter,
    categoryFilter,
  ]);

  // Reset to first page when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortOrder, statusFilter, categoryFilter]);

  // Fetch data when any relevant state changes
  useEffect(() => {
    if (stableUser) {
      fetchArticles();
    }
  }, [
    stableUser,
    searchTerm,
    sortBy,
    sortOrder,
    currentPage,
    statusFilter,
    categoryFilter,
    fetchArticles,
  ]);

  // Open edit modal directly when coming from ArticleContent
  useEffect(() => {
    try {
      const id = localStorage.getItem('editArticleId');
      if (id && Array.isArray(articles)) {
        const target = articles.find((a) => String(a.id) === id);
        if (target) {
          setEditingArticle(target);
          setArticleForm({
            title: target.title,
            content: (target as any).content || '',
            slug: target.slug,
            thumbnail: target.thumbnail || '',
            categoryId: target.category.id,
            published: target.published,
          });
          setShowArticleForm(true);
          localStorage.removeItem('editArticleId');
        }
      }
    } catch {}
  }, [articles]);

  // IntersectionObserver for lazy loading
  useEffect(() => {
    if (!loadMoreRef.current) return;
    if (!pagination.hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !isLoadingMore) {
          setIsLoadingMore(true);
          setCurrentPage((p) => p + 1);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [pagination.hasNextPage, isLoadingMore]);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    // Wait for auth state to be determined
    if (isLoading) {
      return;
    }

    // If not authenticated, redirect to home
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
  }, [user, isAuthenticated, isLoading, router]);

  // Show loading while auth state is being determined
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-gray-700">Please log in to manage your articles.</p>
        </div>
      </div>
    );
  }

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('Please log in to create articles');
      return;
    }

    try {
      await apiPost<CreateArticleResponse>('/api/articles', articleForm as CreateArticleRequest);
      setArticleForm({
        title: '',
        content: '',
        slug: '',
        thumbnail: '',
        categoryId: '',
        published: false,
      });
      setShowArticleForm(false);
      fetchArticles();
    } catch {
      alert('Error creating article. Please try again.');
    }
  };

  const handleEditArticle = (article: Article) => {
    setEditingArticle(article);
    setArticleForm({
      title: article.title,
      content: (article as any).content || '',
      slug: article.slug,
      thumbnail: article.thumbnail || '',
      categoryId: article.category.id,
      published: article.published,
    });
    setShowArticleForm(true);
  };

  const handleUpdateArticle = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingArticle) return;

    if (!user) {
      alert('Please log in to update articles');
      return;
    }

    try {
      const payload: UpdateArticleRequest = { id: editingArticle.id, ...articleForm };
      await apiPut<UpdateArticleResponse>('/api/articles', payload);
      setArticleForm({
        title: '',
        content: '',
        slug: '',
        thumbnail: '',
        categoryId: '',
        published: false,
      });
      setShowArticleForm(false);
      setEditingArticle(null);
      fetchArticles();
    } catch {
      alert('Error updating article. Please try again.');
    }
  };

  const handleDeleteArticle = async (article: Article) => {
    if (!user) {
      alert('Please log in to delete articles');
      return;
    }

    try {
      const _res = await apiDelete<DeleteArticleResponse>(`/api/articles?id=${article.id}`);
      setShowDeleteConfirm(null);
      fetchArticles();
    } catch {
      alert('Error deleting article. Please try again.');
    }
  };

  const handlePreviewArticle = (article: Article) => {
    // Open preview in new tab
    window.open(`/articles/${article.slug}?preview=true`, '_blank');
  };

  const handleTogglePublish = async (article: Article) => {
    if (!user) {
      alert('Please log in to change article status');
      return;
    }

    try {
      const _res = await apiPut<UpdateArticleResponse>('/api/articles', {
        id: article.id,
        published: !article.published,
      } as UpdateArticleRequest);
      fetchArticles();
    } catch (error) {
      console.error('Fetch error:', error);
      alert('Error updating article status. Please try again.');
    }
  };

  const resetForm = () => {
    setArticleForm({
      title: '',
      content: '',
      slug: '',
      thumbnail: '',
      categoryId: '',
      published: false,
    });
    setShowArticleForm(false);
    setEditingArticle(null);
  };

  // Generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <MotionContainer>
          <div className="rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t('articles.my')}</h1>
              <p className="mt-1 text-gray-700 sm:mt-2">{t('articles.manageIntro')}</p>
            </div>

            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold sm:text-xl">
                {t('articles.total')} ({pagination.totalItems})
              </h2>
              <Button className="w-full sm:w-auto" onClick={() => setShowArticleForm(true)}>
                <Plus className="mr-1 h-4 w-4" />
                {t('articles.new')}
              </Button>
            </div>

            {/* Search and Filter Controls (sticky under global header) */}
            <div className="sticky top-16 z-40 mb-6 rounded-xl bg-white/80 p-4 shadow-xl shadow-gray-300/60 backdrop-blur-sm">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Search Input */}
                <div className="lg:col-span-2">
                  <div className="relative">
                    <Search className="absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 transform cursor-pointer text-gray-500" />
                    <Input
                      placeholder={t('articles.searchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="focus:ring-brand/20 pl-10 focus:ring-2"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger className="focus:ring-brand/20 bg-brand/10 text-brand-600 focus:ring-2">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('articles.all')}</SelectItem>
                    <SelectItem value="published">{t('articles.published')}</SelectItem>
                    <SelectItem value="draft">{t('articles.draft')}</SelectItem>
                  </SelectContent>
                </Select>

                {/* Category Filter */}
                <Select
                  value={categoryFilter || 'all'}
                  onValueChange={(value) => setCategoryFilter(value === 'all' ? '' : value)}
                >
                  <SelectTrigger className="focus:ring-brand/20 bg-brand/10 text-brand-600 focus:ring-2">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('articles.allCategories')}</SelectItem>
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

              {/* Sort Controls */}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="back"
                  size="sm"
                  onClick={() => {
                    if (sortBy === 'title') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('title');
                      setSortOrder('asc');
                    }
                  }}
                  className={`px-3 transition-colors ${
                    sortBy === 'title' ? 'bg-brand/10 text-brand-600' : ''
                  }`}
                >
                  <ArrowUpDown className="mr-1 h-4 w-4" />
                  {t('articles.sort.title')}
                  {sortBy === 'title' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </Button>

                <Button
                  variant="back"
                  size="sm"
                  onClick={() => {
                    if (sortBy === 'createdAt') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('createdAt');
                      setSortOrder('desc');
                    }
                  }}
                  className={`px-3 transition-colors ${
                    sortBy === 'createdAt' ? 'bg-brand/10 text-brand-600' : ''
                  }`}
                >
                  <ArrowUpDown className="mr-1 h-4 w-4" />
                  {t('articles.sort.created')}
                  {sortBy === 'createdAt' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </Button>

                <Button
                  variant="back"
                  size="sm"
                  onClick={() => {
                    if (sortBy === 'updatedAt') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('updatedAt');
                      setSortOrder('desc');
                    }
                  }}
                  className={`px-3 transition-colors ${
                    sortBy === 'updatedAt' ? 'bg-brand/10 text-brand-600' : ''
                  }`}
                >
                  <ArrowUpDown className="mr-1 h-4 w-4" />
                  {t('articles.sort.updated')}
                  {sortBy === 'updatedAt' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </Button>
              </div>
            </div>

            {/* Articles List */}
            {articles.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <FileText className="h-8 w-8 text-gray-600" />
                </div>
                <h3 className="mb-2 text-lg font-medium text-gray-900">No articles found</h3>
                <p className="mb-4 text-gray-700">
                  Start sharing your knowledge by creating your first article
                </p>
                <Button onClick={() => setShowArticleForm(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  New Article
                </Button>
              </div>
            ) : (
              (() => {
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
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 gap-3 sm:gap-5 md:grid-cols-2 lg:grid-cols-3"
                  >
                    {articles.map((article) => (
                      <motion.div key={article.id} variants={itemVariants} className="block h-full">
                        <div className="shadow-brand/30 block flex h-full flex-col rounded-2xl bg-white shadow-2xl drop-shadow-2xl">
                          {/* Thumbnail (consistent height whether exists or not) */}
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

                          {/* Article Header */}
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
                                      setOpenDropdown(
                                        openDropdown === article.id ? null : article.id
                                      );
                                    }}
                                    className="h-8 w-8 p-0"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>

                                  {openDropdown === article.id && (
                                    <div className="dropdown-container shadow-brand/40 absolute top-8 right-0 z-50 w-48 rounded-2xl bg-white/95 py-1 shadow-2xl drop-shadow-2xl backdrop-blur-md">
                                      <div
                                        onClick={() => {
                                          handleTogglePublish(article);
                                          setOpenDropdown(null);
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

                                      {user && article.author.id === user.id && (
                                        <div
                                          onClick={() => {
                                            if (article.published) {
                                              // Open published article in new tab
                                              window.open(`/articles/${article.slug}`, '_blank');
                                            } else {
                                              // Open preview for draft
                                              handlePreviewArticle(article);
                                            }
                                            setOpenDropdown(null);
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
                                          handleEditArticle(article);
                                          setOpenDropdown(null);
                                        }}
                                        className="flex w-full cursor-pointer items-center px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50"
                                      >
                                        <Edit className="mr-2 h-4 w-4" />
                                        {t('common.edit')}
                                      </div>

                                      <div
                                        onClick={() => {
                                          setShowDeleteConfirm(article);
                                          setOpenDropdown(null);
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
                                className={
                                  article.published ? 'bg-brand hover:bg-brand-600 text-white' : ''
                                }
                              >
                                {article.published ? t('articles.published') : t('articles.draft')}
                              </Badge>
                            </div>

                            {/* Content preview removed to reduce payload and avoid undefined content */}

                            <div className="flex items-center text-xs text-gray-700 sm:text-sm">
                              <div className="from-brand to-brand-700 mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold text-white sm:mr-3 sm:text-xs">
                                {article.author.name?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <span className="font-medium">{article.author.name}</span>
                            </div>
                          </div>

                          {/* Article Footer */}
                          <div className="bg-gray-50/50 px-4 py-3 sm:px-6 sm:py-4">
                            <div className="grid grid-cols-3 text-xs text-gray-700 sm:text-sm">
                              {/* Views - Left */}
                              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                                <Eye className="h-4 w-4 text-gray-600" />
                                <span className="font-medium tabular-nums">
                                  {typeof article.views === 'number' ? article.views : 0}
                                </span>
                              </div>
                              {/* Likes - Center */}
                              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                                <ThumbsUp className="h-4 w-4 text-gray-600" />
                                <span className="font-medium tabular-nums">
                                  {article._count.likes}
                                </span>
                              </div>
                              {/* Comments - Right */}
                              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                                <MessageSquare className="h-4 w-4 text-gray-600" />
                                <span className="font-medium tabular-nums">
                                  {article._count.comments}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                );
              })()
            )}

            {/* Lazy load sentinel */}
            <div ref={loadMoreRef} className="h-10 w-full" />
            {isLoadingMore && (
              <div className="mt-2 text-center text-sm text-gray-600">Loading more...</div>
            )}

            {/* Article Form Modal */}
            {showArticleForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6">
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold">
                      {editingArticle
                        ? t('common.edit') + ' Article'
                        : t('articles.form.createNew')}
                    </h2>
                  </div>

                  <form
                    onSubmit={editingArticle ? handleUpdateArticle : handleCreateArticle}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t('articles.form.title')} *</label>
                        <Input
                          placeholder={t('articles.form.titlePlaceholder')}
                          value={articleForm.title}
                          onChange={(e) => {
                            const title = e.target.value;
                            setArticleForm({
                              ...articleForm,
                              title,
                              slug: editingArticle ? articleForm.slug : generateSlug(title),
                            });
                          }}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t('articles.form.slug')} *</label>
                        <Input
                          placeholder={t('articles.form.slugPlaceholder')}
                          value={articleForm.slug}
                          onChange={(e) => setArticleForm({ ...articleForm, slug: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('articles.form.thumbnail')}</label>
                      {articleForm.thumbnail ? (
                        <div className="space-y-2">
                          <div className="relative w-full max-w-sm">
                            <img
                              src={articleForm.thumbnail}
                              alt="Thumbnail preview"
                              className="h-40 w-full rounded-lg object-cover"
                            />
                            <Button
                              type="button"
                              variant="back"
                              size="sm"
                              onClick={() => setArticleForm({ ...articleForm, thumbnail: '' })}
                              className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="back"
                            onClick={() => setShowImageUpload(true)}
                            className="w-full max-w-sm"
                          >
                            <Upload className="mr-2 h-4 w-4" />
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
                            <Upload className="h-8 w-8 text-gray-600" />
                            <span className="text-sm font-medium text-gray-700">
                              {t('articles.form.clickToUpload')}
                            </span>
                          </button>
                          <p className="mt-2 text-xs text-gray-500">
                            {t('articles.form.thumbHint')}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('articles.form.category')} *</label>
                      <Select
                        value={articleForm.categoryId || 'placeholder'}
                        onValueChange={(value) =>
                          setArticleForm({
                            ...articleForm,
                            categoryId: value === 'placeholder' ? '' : value,
                          })
                        }
                      >
                        <SelectTrigger
                          className={`focus:ring-brand/20 focus:ring-2 ${
                            articleForm.categoryId
                              ? 'bg-brand/10 text-brand-600'
                              : 'bg-white text-gray-700'
                          }`}
                        >
                          <SelectValue placeholder={t('articles.form.selectCategory')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="placeholder" disabled>
                            {t('articles.form.selectCategory')}
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
                      <label className="text-sm font-medium">{t('articles.form.content')} *</label>
                      <TiptapRichTextEditor
                        value={articleForm.content}
                        onChange={(value) => setArticleForm({ ...articleForm, content: value })}
                        placeholder="Write your article content here..."
                        className="min-h-[400px]"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="published"
                        checked={articleForm.published}
                        onChange={(e) =>
                          setArticleForm({ ...articleForm, published: e.target.checked })
                        }
                        className="accent-brand focus:ring-brand h-4 w-4 rounded border-gray-300"
                      />
                      <label htmlFor="published" className="text-sm font-medium">
                        {t('articles.form.publishNow')}
                      </label>
                    </div>
                  </form>

                  <div className="mt-6 flex justify-end gap-2">
                    <Button variant="back" onClick={resetForm}>
                      {t('common.cancel')}
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      onClick={editingArticle ? handleUpdateArticle : handleCreateArticle}
                      disabled={!editingArticle && isCreateDisabled}
                    >
                      {editingArticle ? t('common.edit') : t('common.create')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-lg bg-white p-6">
                  <h2 className="mb-4 text-lg font-semibold">Delete Article</h2>
                  <p className="mb-6 text-gray-700">
                    Are you sure you want to delete &quot;{showDeleteConfirm?.title}&quot;? This
                    action cannot be undone and will also delete all comments and likes.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="back" onClick={() => setShowDeleteConfirm(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="back"
                      onClick={() => showDeleteConfirm && handleDeleteArticle(showDeleteConfirm)}
                      className="border-red-600 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Image Upload Modal */}
            {showImageUpload && (
              <ImageUpload
                onImageUploaded={(imageUrl) => {
                  setArticleForm({ ...articleForm, thumbnail: imageUrl });
                  setShowImageUpload(false);
                }}
                onClose={() => setShowImageUpload(false)}
              />
            )}
          </div>
        </MotionContainer>
      </div>
    </div>
  );
}

export default function ArticlesPage() {
  return (
    <ClientOnly
      fallback={<LoadingScreen message="Loading articles..." size="lg" variant="default" />}
    >
      <ArticlesContent />
    </ClientOnly>
  );
}
