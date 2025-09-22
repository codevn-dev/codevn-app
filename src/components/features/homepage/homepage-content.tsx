'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Search, MessageSquare, BookOpen, Calendar, Eye, X } from 'lucide-react';
import { useForumStore } from '@/stores';
import { CategorySelector } from '@/features/articles';
import { useAuthState } from '@/hooks/use-auth-state';
import { findCategoryById } from '@/features/articles';
import { apiGet } from '@/lib/utils';
import { Category, ArticleListResponse } from '@/types/shared';

export function HomepageContent() {
  const { user, isAuthenticated } = useAuthState();
  const {
    categories,
    articles,
    searchTerm,
    isLoading,
    error,
    setCategories,
    setArticles,
    addArticles,
    setSearchTerm,
    setLoading,
    setError,
    articlesPage,
    setArticlesPage,
    hasMoreArticles,
    setHasMoreArticles,
  } = useForumStore();

  const [selectedCategoryNames, setSelectedCategoryNames] = useState<string[]>([]);
  const [onlyMine, setOnlyMine] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Helpers
  const getCategoryById = (id: string) => findCategoryById(categories, id);
  const getCategoryByName = (name: string) =>
    categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
  const getDescendantNames = (name: string): string[] => {
    const cat = getCategoryByName(name);
    if (!cat) return [];
    const childNames = (cat.children || []).map((c) => c.name);
    return [name, ...childNames];
  };

  // Fetch categories once
  useEffect(() => {
    const fetchCategoriesOnce = async () => {
      try {
        const categoriesData = await apiGet<Category[]>('/api/categories');
        setCategories(categoriesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    };
    fetchCategoriesOnce();
  }, [setCategories, setError]);

  // Read filters from URL on first load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get('search') || '';
    const names = (params.get('categoryNames') || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const mine = params.get('mine') === '1';
    if (q) setSearchTerm(q);
    if (names.length > 0) setSelectedCategoryNames(names);
    if (mine) setOnlyMine(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch articles with pagination and server-side filters
  useEffect(() => {
    const fetchArticlesPage = async () => {
      setLoading(articlesPage === 1);
      setIsLoadingMore(articlesPage > 1);
      setError(null);

      try {
        const params = new URLSearchParams({
          publishedOnly: 'true',
          page: String(articlesPage),
          limit: '9',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });
        if (searchTerm) params.set('search', searchTerm);
        if (selectedCategoryNames.length > 0)
          params.set(
            'categoryNames',
            selectedCategoryNames.map((name) => name.toLowerCase()).join(',')
          );
        if (onlyMine && isAuthenticated && user) params.set('authorId', user.id);

        const res = await apiGet<ArticleListResponse>(`/api/articles?${params.toString()}`);
        if (articlesPage === 1) {
          setArticles(res.articles);
        } else {
          addArticles(res.articles);
        }
        setHasMoreArticles(res.pagination.hasNext);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
      }
    };

    fetchArticlesPage();
  }, [
    articlesPage,
    searchTerm,
    selectedCategoryNames,
    onlyMine,
    isAuthenticated,
    user,
    setArticles,
    addArticles,
    setHasMoreArticles,
    setLoading,
    setError,
  ]);

  // Reset to first page when filter/search changes
  useEffect(() => {
    setArticlesPage(1);
  }, [searchTerm, selectedCategoryNames, onlyMine, setArticlesPage]);

  // Sync filters to URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (selectedCategoryNames.length > 0)
      params.set(
        'categoryNames',
        selectedCategoryNames.map((name) => name.toLowerCase()).join(',')
      );
    if (onlyMine) params.set('mine', '1');
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState(null, '', newUrl);
  }, [searchTerm, selectedCategoryNames, onlyMine]);

  // IntersectionObserver for lazy load
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMoreArticles && !isLoadingMore && !isLoading) {
          setArticlesPage(articlesPage + 1);
        }
      },
      { root: null, rootMargin: '600px 0px', threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMoreArticles, isLoadingMore, isLoading, articles.length, articlesPage, setArticlesPage]);

  const filteredArticles = Array.isArray(articles) ? articles : [];

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-red-600">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10 md:space-y-12">
      {/* Hero Section */}
      <div className="py-6 text-center sm:py-8">
        {/* Search Bar */}
        <div className="mx-auto max-w-2xl px-3 sm:px-0">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
            <Input
              placeholder="Search articles, topics, or authors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 pl-10 text-base sm:h-12 sm:text-lg"
            />
          </div>
        </div>
      </div>

      {/* Categories Section - Horizontal Layout */}
      <CategorySelector
        categories={categories}
        selectedCategoryIds={selectedCategoryNames
          .map((name) => {
            const cat = getCategoryByName(name);
            return cat ? cat.id : '';
          })
          .filter(Boolean)}
        onCategoryToggle={(id) => {
          const cat = getCategoryById(id);
          if (!cat) return;
          const namesToToggle = getDescendantNames(cat.name).map((name) => name.toLowerCase());
          setSelectedCategoryNames((prev) => {
            const set = new Set(prev);
            const hasAll = namesToToggle.every((x) => set.has(x));
            if (hasAll) {
              namesToToggle.forEach((x) => set.delete(x));
            } else {
              namesToToggle.forEach((x) => set.add(x));
            }
            return Array.from(set);
          });
        }}
      />

      {/* Articles Section */}
      <div>
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div>
              <h2 className="mb-1 text-2xl font-bold text-gray-900 sm:mb-2 sm:text-3xl">
                Latest Articles
              </h2>
              <p className="text-base text-gray-600 sm:text-lg">
                Fresh insights from the Vietnamese developer community
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isAuthenticated && (
                <Button
                  variant={onlyMine ? 'default' : 'outline'}
                  onClick={() => setOnlyMine((v) => !v)}
                  className={onlyMine ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                >
                  My Articles
                </Button>
              )}
              {(onlyMine || searchTerm || selectedCategoryNames.length > 0) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setOnlyMine(false);
                    setSearchTerm('');
                    setSelectedCategoryNames([]);
                  }}
                >
                  Clear all
                </Button>
              )}
            </div>
          </div>
          {selectedCategoryNames.length > 0 && (
            <div className="mt-2 flex items-center gap-2 sm:gap-3">
              <span className="text-xs font-medium text-gray-600 sm:text-sm">Filtered by:</span>
              <div className="flex flex-wrap gap-2">
                {selectedCategoryNames.map((name) => {
                  const cat = getCategoryByName(name);
                  if (!cat) return null;
                  return (
                    <div
                      key={name}
                      className="flex items-center rounded-full border-2 px-3 py-1.5 text-xs font-semibold shadow-sm sm:px-4 sm:py-2 sm:text-sm"
                      style={{
                        backgroundColor: `${cat.color || '#3B82F6'}15`,
                        borderColor: cat.color || '#3B82F6',
                        color: cat.color || '#3B82F6',
                      }}
                    >
                      <div
                        className="mr-2 h-2 w-2 rounded-full"
                        style={{ backgroundColor: cat.color || '#3B82F6' }}
                      />
                      {cat.name}
                      <button
                        onClick={() =>
                          setSelectedCategoryNames((prev) => prev.filter((x) => x !== name))
                        }
                        aria-label={`Remove ${cat.name}`}
                        title={`Remove ${cat.name}`}
                        className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-current/30 text-current hover:bg-current/10"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredArticles.map((article) => (
            <Link
              key={article.id}
              href={`/articles/${article.slug}`}
              className="group block flex h-full transform cursor-pointer flex-col overflow-hidden rounded-2xl border border-gray-200/50 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/50"
            >
              {/* Thumbnail (consistent height whether exists or not) */}
              <div className="h-28 w-full overflow-hidden sm:h-32">
                {article.thumbnail ? (
                  <img
                    src={article.thumbnail}
                    alt={article.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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
                    className="inline-flex items-center rounded-full px-2.5 py-1.5 text-[10px] font-semibold transition-all duration-200 hover:scale-105 sm:px-3 sm:text-xs"
                    style={{
                      backgroundColor: `${article.category.color}15`,
                      color: article.category.color,
                      border: `1px solid ${article.category.color}30`,
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const categoryName = article.category.name.toLowerCase();
                      setSelectedCategoryNames((prev) =>
                        prev.includes(categoryName)
                          ? prev.filter((x) => x !== categoryName)
                          : [...prev, categoryName]
                      );
                    }}
                  >
                    <div
                      className="mr-2 h-2 w-2 rounded-full"
                      style={{ backgroundColor: article.category.color }}
                    ></div>
                    {article.category.name}
                  </button>
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="mr-1 h-3 w-3" />
                    {new Date(article.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>

                <h3 className="mb-2 line-clamp-2 flex-1 text-lg font-bold text-gray-900 transition-colors group-hover:text-blue-600 sm:mb-3 sm:text-xl">
                  {article.title}
                </h3>

                <div className="flex items-center text-xs text-gray-600 sm:text-sm">
                  <div className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-[10px] font-bold text-white sm:mr-3 sm:text-xs">
                    {article.author.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium">{article.author.name}</span>
                </div>
              </div>

              {/* Article Footer */}
              <div className="border-t border-gray-100/50 bg-gray-50/50 px-4 py-3 sm:px-6 sm:py-4">
                <div className="grid grid-cols-3 text-xs text-gray-600 sm:text-sm">
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-500" aria-hidden="true" />
                    <span className="font-medium tabular-nums" aria-label="comments count">
                      {article._count.comments}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                    <BookOpen className="h-4 w-4 text-gray-500" aria-hidden="true" />
                    <span className="font-medium tabular-nums" aria-label="likes count">
                      {article._count.likes}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                    <Eye className="h-4 w-4 text-gray-500" />
                    <span className="font-medium tabular-nums" aria-label="views count">
                      {typeof article.views === 'number' ? article.views : 0}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredArticles.length === 0 && (
          <div className="px-4 py-12 text-center sm:py-16">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-100 to-purple-100 sm:mb-6 sm:h-20 sm:w-20">
              <BookOpen className="h-8 w-8 text-blue-600 sm:h-10 sm:w-10" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-gray-900 sm:mb-3 sm:text-2xl">
              No articles found
            </h3>
            <p className="mx-auto mb-6 max-w-md text-base text-gray-600 sm:mb-8 sm:text-lg">
              {searchTerm || selectedCategoryNames.length > 0
                ? "Try adjusting your search or filter criteria to find what you're looking for."
                : 'Be the first to share your knowledge with the community!'}
            </p>
            <Button
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategoryNames([]);
              }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 font-semibold text-white hover:from-blue-600 hover:to-purple-700"
            >
              {searchTerm || selectedCategoryNames.length > 0 ? 'Clear Filters' : 'Explore Topics'}
            </Button>
          </div>
        )}

        {/* Lazy load sentinel */}
        <div ref={loadMoreRef} className="h-10 w-full" />
        {isLoadingMore && (
          <div className="mt-2 text-center text-sm text-gray-500">Loading more...</div>
        )}
      </div>
    </div>
  );
}
