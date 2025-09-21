'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardBody } from '@/components/ui/card';
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
  Tag,
  ExternalLink,
  Upload,
  X,
  MoreVertical,
} from 'lucide-react';
import { useAuthState } from '@/hooks/use-auth-state';
import { ClientOnly } from '@/components/layout';
import { TiptapRichTextEditor, CodeHighlighter } from '@/features/articles';
import { ImageUpload } from '@/features/upload';
import { Article, Category } from '@/types/shared';

function ArticlesContent() {
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
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'createdAt' | 'updatedAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

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
      const response = await fetch('/api/categories');
      if (response.ok) {
        const categoriesData = await response.json();
        setCategories(categoriesData);
      }
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

      const response = await fetch(`/api/articles?${params}`);

      if (response.ok) {
        const data = await response.json();
        setArticles(data.articles);
        setPagination(data.pagination);
      }
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
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
          <p className="text-gray-600">Please log in to manage your articles.</p>
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
      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(articleForm),
      });

      if (response.ok) {
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
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create article');
      }
    } catch {
      alert('Error creating article. Please try again.');
    }
  };

  const handleEditArticle = (article: Article) => {
    setEditingArticle(article);
    setArticleForm({
      title: article.title,
      content: article.content,
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
      const response = await fetch('/api/articles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingArticle.id,
          ...articleForm,
        }),
      });

      if (response.ok) {
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
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update article');
      }
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
      const response = await fetch(`/api/articles?id=${article.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShowDeleteConfirm(null);
        fetchArticles();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete article');
      }
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
      const response = await fetch('/api/articles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: article.id,
          published: !article.published,
        }),
      });

      if (response.ok) {
        fetchArticles();
      } else {
        const error = await response.json();
        console.error('Error response:', error);
        alert(error.error || 'Failed to update article status');
      }
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">My Articles</h1>
          <p className="mt-1 text-gray-600 sm:mt-2">
            Manage your articles and share your knowledge
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold sm:text-xl">Articles ({pagination.totalItems})</h2>
          <Button className="w-full sm:w-auto" onClick={() => setShowArticleForm(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New Article
          </Button>
        </div>

        {/* Search and Filter Controls */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Search Input */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <Input
                  placeholder="Search your articles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-gray-300 pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Articles</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select
              value={categoryFilter || 'all'}
              onValueChange={(value) => setCategoryFilter(value === 'all' ? '' : value)}
            >
              <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort Controls */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (sortBy === 'title') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('title');
                  setSortOrder('asc');
                }
              }}
              className={`border-gray-300 px-3 transition-colors hover:border-gray-400 ${
                sortBy === 'title'
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700'
              }`}
            >
              <ArrowUpDown className="mr-1 h-4 w-4" />
              Title
              {sortBy === 'title' && (
                <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (sortBy === 'createdAt') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('createdAt');
                  setSortOrder('desc');
                }
              }}
              className={`border-gray-300 px-3 transition-colors hover:border-gray-400 ${
                sortBy === 'createdAt'
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700'
              }`}
            >
              <ArrowUpDown className="mr-1 h-4 w-4" />
              Created
              {sortBy === 'createdAt' && (
                <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (sortBy === 'updatedAt') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('updatedAt');
                  setSortOrder('desc');
                }
              }}
              className={`border-gray-300 px-3 transition-colors hover:border-gray-400 ${
                sortBy === 'updatedAt'
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700'
              }`}
            >
              <ArrowUpDown className="mr-1 h-4 w-4" />
              Updated
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
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-900">No articles found</h3>
            <p className="mb-4 text-gray-500">
              Start sharing your knowledge by creating your first article
            </p>
            <Button onClick={() => setShowArticleForm(true)}>
              <Plus className="mr-1 h-4 w-4" />
              New Article
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <Card key={article.id} className="shadow-sm transition-shadow hover:shadow-md">
                <CardBody className="p-4 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    {/* Thumbnail */}
                    {article.thumbnail && (
                      <div className="flex-shrink-0 sm:mr-4">
                        <img
                          src={article.thumbnail}
                          alt={article.title}
                          className="h-40 w-full rounded-lg border object-cover sm:h-24 sm:w-32"
                        />
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <h3 className="line-clamp-2 text-lg font-bold text-gray-900 sm:text-xl">
                            {article.title}
                          </h3>
                          <Badge
                            variant={article.published ? 'default' : 'secondary'}
                            className={
                              article.published ? 'bg-blue-600 text-white hover:bg-blue-700' : ''
                            }
                          >
                            {article.published ? 'Published' : 'Draft'}
                          </Badge>
                        </div>
                        <div className="dropdown-container relative self-start sm:self-auto">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdown(openDropdown === article.id ? null : article.id);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>

                          {openDropdown === article.id && (
                            <div className="dropdown-container absolute top-8 right-0 z-50 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                              <div
                                onClick={() => {
                                  handleTogglePublish(article);
                                  setOpenDropdown(null);
                                }}
                                className={`flex w-full cursor-pointer items-center px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                                  article.published ? 'text-orange-600' : 'text-green-600'
                                }`}
                              >
                                {article.published ? (
                                  <>
                                    <EyeOff className="mr-2 h-4 w-4" />
                                    Unpublish
                                  </>
                                ) : (
                                  <>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Publish
                                  </>
                                )}
                              </div>

                              {!article.published && user && article.author.id === user.id && (
                                <div
                                  onClick={() => {
                                    handlePreviewArticle(article);
                                    setOpenDropdown(null);
                                  }}
                                  className="flex w-full cursor-pointer items-center px-4 py-2 text-left text-sm text-blue-600 hover:bg-gray-50"
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Preview
                                </div>
                              )}

                              <div
                                onClick={() => {
                                  handleEditArticle(article);
                                  setOpenDropdown(null);
                                }}
                                className="flex w-full cursor-pointer items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </div>

                              <div
                                onClick={() => {
                                  setShowDeleteConfirm(article);
                                  setOpenDropdown(null);
                                }}
                                className="flex w-full cursor-pointer items-center px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mb-3 line-clamp-2 text-sm text-gray-600">
                        <CodeHighlighter
                          content={article.content.substring(0, 150) + '...'}
                          className="text-sm"
                        />
                      </div>

                      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 sm:text-sm">
                        <div className="flex items-center gap-1">
                          <Tag className="h-4 w-4" style={{ color: article.category.color }} />
                          <span>{article.category.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(article.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>{article._count.comments} comments</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>{article._count.likes} likes</span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-400">Slug: {article.slug}</div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:px-6">
            <div className="flex items-center text-sm text-gray-700">
              <span>
                Page {pagination.currentPage} of {pagination.totalPages} | {pagination.itemsPerPage}{' '}
                articles per page
              </span>
            </div>
            <div className="flex w-full items-center space-x-2 overflow-x-auto sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPrevPage}
                className="px-3 py-1"
              >
                Previous
              </Button>

              <div className="flex items-center space-x-1">
                {(() => {
                  const pages = [];
                  const currentPage = pagination.currentPage;
                  const totalPages = pagination.totalPages;
                  const maxVisiblePages = 5;

                  if (totalPages <= maxVisiblePages + 1) {
                    for (let i = 1; i <= totalPages; i++) {
                      pages.push(i);
                    }
                  } else {
                    let startPage = Math.max(1, currentPage - 2);
                    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                    if (endPage - startPage < maxVisiblePages - 1) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1);
                    }

                    if (startPage > 1) {
                      pages.push(1);
                      if (startPage > 2) {
                        pages.push('...');
                      }
                    }

                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(i);
                    }

                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push('...');
                      }
                      pages.push(totalPages);
                    }
                  }

                  return pages.map((page, index) => {
                    if (page === '...') {
                      return (
                        <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                          ...
                        </span>
                      );
                    }

                    return (
                      <Button
                        key={page}
                        variant={pagination.currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(page as number)}
                        className={`min-w-[40px] px-3 py-1 ${
                          pagination.currentPage === page
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </Button>
                    );
                  });
                })()}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className="px-3 py-1"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Article Form Modal */}
        {showArticleForm && (
          <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">
                  {editingArticle ? 'Edit Article' : 'Create New Article'}
                </h2>
              </div>

              <form
                onSubmit={editingArticle ? handleUpdateArticle : handleCreateArticle}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title *</label>
                    <Input
                      placeholder="Enter article title"
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
                    <label className="text-sm font-medium">Slug *</label>
                    <Input
                      placeholder="article-slug"
                      value={articleForm.slug}
                      onChange={(e) => setArticleForm({ ...articleForm, slug: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Thumbnail Image</label>
                  {articleForm.thumbnail ? (
                    <div className="space-y-2">
                      <div className="relative w-full max-w-sm">
                        <img
                          src={articleForm.thumbnail}
                          alt="Thumbnail preview"
                          className="h-40 w-full rounded-lg border object-cover"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setArticleForm({ ...articleForm, thumbnail: '' })}
                          className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
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
                        className="group flex h-40 w-full flex-col items-center justify-center space-y-2 rounded-lg border-2 border-dashed border-gray-300 bg-white transition-colors hover:border-gray-400"
                      >
                        <Upload className="h-8 w-8 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">
                          Click to upload thumbnail
                        </span>
                      </button>
                      <p className="mt-2 text-xs text-gray-400">PNG, JPG, GIF, WebP up to 5MB</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Category *</label>
                  <Select
                    value={articleForm.categoryId || 'placeholder'}
                    onValueChange={(value) =>
                      setArticleForm({
                        ...articleForm,
                        categoryId: value === 'placeholder' ? '' : value,
                      })
                    }
                  >
                    <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
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
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="published" className="text-sm font-medium">
                    Publish immediately
                  </label>
                </div>
              </form>

              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  onClick={editingArticle ? handleUpdateArticle : handleCreateArticle}
                >
                  {editingArticle ? 'Update Article' : 'Create Article'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
            <div className="w-full max-w-md rounded-lg bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold">Delete Article</h2>
              <p className="mb-6 text-gray-600">
                Are you sure you want to delete &quot;{showDeleteConfirm?.title}&quot;? This action
                cannot be undone and will also delete all comments and likes.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
                  Cancel
                </Button>
                <Button
                  variant="outline"
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
