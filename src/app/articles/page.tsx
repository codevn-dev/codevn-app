'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/ui/loading-screen';
import {} from '@/components/ui/select';
import { Plus, FileText } from 'lucide-react';
import { useAuthState } from '@/hooks/use-auth-state';
import { ClientOnly, MotionContainer } from '@/components/layout';
import {
  ArticlesHeader,
  ArticlesControls,
  ArticlesGrid,
  ArticlesFormModal,
  ArticlesDeleteModal,
} from '@/features/articles';
import dynamic from 'next/dynamic';

// Lazy load ImageUpload component to reduce initial bundle size
const ImageUpload = dynamic(
  () => import('@/features/upload').then((m) => m.ImageUpload),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-lg bg-white p-6 text-center">
          <div className="text-lg font-semibold">Loading image upload...</div>
        </div>
      </div>
    ),
  }
);
import {} from '@/lib/utils/time-format';
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
      <div className="2xl:max-w-8xl mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="py-8">
      <div className="2xl:max-w-8xl mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <MotionContainer>
          <div className="rounded-2xl bg-white p-6 shadow-2xl">
            <ArticlesHeader
              totalItems={pagination.totalItems}
              onCreate={() => setShowArticleForm(true)}
            />

            <ArticlesControls
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter as any}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={(v) => setCategoryFilter(v)}
              categories={categories}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={(sb, so) => {
                setSortBy(sb);
                setSortOrder(so);
              }}
            />

            {/* Articles List */}
            {articles.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <FileText className="h-8 w-8 text-gray-600" />
                </div>
                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  {t('myArticles.noArticlesFound')}
                </h3>
                <p className="mb-4 text-gray-700">{t('myArticles.startSharingKnowledge')}</p>
                <Button onClick={() => setShowArticleForm(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  {t('myArticles.newArticle')}
                </Button>
              </div>
            ) : (
              <ArticlesGrid
                articles={articles}
                userId={user?.id}
                openDropdown={openDropdown}
                onToggleDropdown={(id) =>
                  setOpenDropdown(openDropdown === (id as any) ? null : (id as any))
                }
                onCloseDropdown={() => setOpenDropdown(null)}
                onTogglePublish={handleTogglePublish}
                onPreview={handlePreviewArticle}
                onEdit={handleEditArticle}
                onDeleteRequest={(article) => setShowDeleteConfirm(article)}
              />
            )}

            {/* Lazy load sentinel */}
            <div ref={loadMoreRef} className="h-10 w-full" />
            {isLoadingMore && (
              <div className="mt-2 text-center text-sm text-gray-600">Loading more...</div>
            )}

            <ArticlesFormModal
              open={showArticleForm}
              isEditing={!!editingArticle}
              form={articleForm}
              categories={categories}
              onClose={resetForm}
              onChange={(f) => setArticleForm(f)}
              onSubmit={
                editingArticle
                  ? () => handleUpdateArticle({ preventDefault: () => {} } as any)
                  : () => handleCreateArticle({ preventDefault: () => {} } as any)
              }
              onOpenImageUpload={() => setShowImageUpload(true)}
              onRemoveThumbnail={() => setArticleForm({ ...articleForm, thumbnail: '' })}
              isCreateDisabled={isCreateDisabled}
            />

            <ArticlesDeleteModal
              open={!!showDeleteConfirm}
              articleTitle={showDeleteConfirm?.title}
              onClose={() => setShowDeleteConfirm(null)}
              onConfirm={() => showDeleteConfirm && handleDeleteArticle(showDeleteConfirm)}
            />

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
