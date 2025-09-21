'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Search, MessageSquare, BookOpen, Calendar } from 'lucide-react';
import { useForumStore } from '@/stores';
import { CategorySelector } from '@/features/articles';
import { findCategoryById } from '@/features/articles';
import { apiGet } from '@/lib/utils';

export function DashboardContent() {
  const {
    categories,
    articles,
    searchTerm,
    isLoading,
    error,
    setCategories,
    setArticles,
    setSearchTerm,
    setLoading,
    setError,
  } = useForumStore();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [categoriesData, articlesResponse] = await Promise.all([
          apiGet('/api/categories'),
          apiGet('/api/articles?publishedOnly=true'),
        ]);

        setCategories(categoriesData);
        // Handle both old format (array) and new format (object with articles property)
        const articlesData = Array.isArray(articlesResponse)
          ? articlesResponse
          : articlesResponse.articles || [];
        setArticles(articlesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [setCategories, setArticles, setLoading, setError]);

  const filteredArticles = (Array.isArray(articles) ? articles : []).filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.category.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !selectedCategoryId || article.categoryId === selectedCategoryId;

    return matchesSearch && matchesCategory;
  });

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
        selectedCategoryId={selectedCategoryId}
        onCategorySelect={setSelectedCategoryId}
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
            {selectedCategoryId && (
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-xs font-medium text-gray-600 sm:text-sm">Filtered by:</span>
                <div
                  className="flex items-center rounded-full border-2 px-3 py-1.5 text-xs font-semibold shadow-sm sm:px-4 sm:py-2 sm:text-sm"
                  style={{
                    backgroundColor: `${findCategoryById(categories, selectedCategoryId)?.color || '#3B82F6'}15`,
                    borderColor:
                      findCategoryById(categories, selectedCategoryId)?.color || '#3B82F6',
                    color: findCategoryById(categories, selectedCategoryId)?.color || '#3B82F6',
                  }}
                >
                  <div
                    className="mr-2 h-2 w-2 rounded-full"
                    style={{
                      backgroundColor:
                        findCategoryById(categories, selectedCategoryId)?.color || '#3B82F6',
                    }}
                  ></div>
                  {findCategoryById(categories, selectedCategoryId)?.name || 'Unknown'}
                </div>
              </div>
            )}
          </div>
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
              <div className="p-4 pb-3 sm:p-6 sm:pb-4">
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
                      setSelectedCategoryId(article.categoryId);
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

                <h3 className="mb-2 line-clamp-2 text-lg font-bold text-gray-900 transition-colors group-hover:text-blue-600 sm:mb-3 sm:text-xl">
                  {article.title}
                </h3>

                <div className="mb-3 flex items-center text-xs text-gray-600 sm:mb-4 sm:text-sm">
                  <div className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-[10px] font-bold text-white sm:mr-3 sm:text-xs">
                    {article.author.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium">{article.author.name}</span>
                </div>
              </div>

              {/* Article Footer */}
              <div className="mt-auto border-t border-gray-100/50 bg-gray-50/50 px-4 py-3 sm:px-6 sm:py-4">
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
                    <svg
                      className="h-4 w-4 text-gray-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <span className="font-medium tabular-nums" aria-label="views count">
                      {typeof (article as any).views === 'number' ? (article as any).views : 0}
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
              {searchTerm || selectedCategoryId
                ? "Try adjusting your search or filter criteria to find what you're looking for."
                : 'Be the first to share your knowledge with the community!'}
            </p>
            <Button
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategoryId(null);
              }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 font-semibold text-white hover:from-blue-600 hover:to-purple-700"
            >
              {searchTerm || selectedCategoryId ? 'Clear Filters' : 'Explore Topics'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
