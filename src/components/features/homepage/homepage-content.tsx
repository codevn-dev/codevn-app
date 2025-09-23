'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MotionContainer } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, BookOpen, Calendar, Eye, X, ThumbsUp, ArrowUp } from 'lucide-react';
import { useForumStore } from '@/stores';
import { CategorySelector } from '@/features/articles';
import { useAuthState } from '@/hooks/use-auth-state';
import { findCategoryById } from '@/features/articles';
import { apiGet } from '@/lib/utils';
import { Category, ArticleListResponse } from '@/types/shared';

export function HomepageContent() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthState();
  const {
    categories,
    articles,
    isLoading,
    error,
    setCategories,
    setArticles,
    addArticles,
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
  const [showBackToTop, setShowBackToTop] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isFiltersInitializedRef = useRef(false);
  const lastFetchKeyRef = useRef<string | null>(null);
  const isFetchInFlightRef = useRef(false);
  const initialPageLoadedRef = useRef(false);
  const isPaginatingRef = useRef(false);
  const articlesPageRef = useRef(articlesPage);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastLoadedFilterSigRef = useRef<string | null>(null);
  const lastLoadedPageRef = useRef<number>(0);
  const prevFilterSigRef = useRef<string | null>(null);

  // Stable derived keys for deps
  const selectedNamesKey = selectedCategoryNames.join(',');
  const filterSigBase = `${[...selectedCategoryNames].sort().join(',')}|${onlyMine ? '1' : '0'}`;
  const authUserId = user?.id || '';

  // Helpers
  const getCategoryById = (id: string) => findCategoryById(categories, id);
  const getCategoryByName = (name: string) => {
    const target = name.toLowerCase();
    const dfs = (list: typeof categories): (typeof categories)[number] | undefined => {
      for (const c of list) {
        if (c.name.toLowerCase() === target) return c;
        if (Array.isArray(c.children) && c.children.length > 0) {
          const found = dfs(c.children as any);
          if (found) return found;
        }
      }
      return undefined;
    };
    return dfs(categories);
  };
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
    const names = (params.get('categories') || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const mine = params.get('mine') === '1';
    if (names.length > 0) setSelectedCategoryNames(names);
    if (mine) setOnlyMine(true);
    isFiltersInitializedRef.current = true;
  }, []);

  // Fetch articles with pagination and server-side filters
  useEffect(() => {
    if (!isFiltersInitializedRef.current) return; // wait until URL filters parsed
    if (onlyMine && (isAuthLoading || !isAuthenticated || !authUserId)) return; // wait for auth

    const fetchArticlesPage = async () => {
      const filterSig = `${filterSigBase}|${isAuthenticated && authUserId ? authUserId : ''}`;

      // Prevent refetching page=1 for the same filters once it's already loaded
      // Only block duplicate fetch for the same page+filters (not just page 1)
      if (
        lastLoadedFilterSigRef.current === filterSig &&
        lastLoadedPageRef.current === articlesPage
      ) {
        return;
      }
      const params = new URLSearchParams({
        publishedOnly: 'true',
        page: String(articlesPage),
        limit: '9',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      if (selectedCategoryNames.length > 0)
        params.set('categories', selectedCategoryNames.map((name) => name.toLowerCase()).join(','));
      if (onlyMine && isAuthenticated && authUserId) params.set('authorId', authUserId);
      const fetchKey = params.toString();

      if (isFetchInFlightRef.current && lastFetchKeyRef.current === fetchKey) return; // in-flight duplicate
      if (lastFetchKeyRef.current === fetchKey) return; // already fetched with same key

      isFetchInFlightRef.current = true;
      lastFetchKeyRef.current = fetchKey;

      setLoading(articlesPage === 1);
      setIsLoadingMore(articlesPage > 1);
      setError(null);
      let nextHasMore = hasMoreArticles;

      try {
        const res = await apiGet<ArticleListResponse>(`/api/articles?${fetchKey}`);
        if (articlesPage === 1) {
          setArticles(res.articles);
          initialPageLoadedRef.current = true;
        } else {
          addArticles(res.articles);
        }
        setHasMoreArticles(res.pagination.hasNext);
        nextHasMore = res.pagination.hasNext;

        // Mark last loaded page and filter signature
        lastLoadedFilterSigRef.current = filterSig;
        lastLoadedPageRef.current = articlesPage;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
        isFetchInFlightRef.current = false;
        isPaginatingRef.current = false;
        // Re-observe sentinel after load completes
        const el = loadMoreRef.current;
        if (el && nextHasMore) {
          observerRef.current?.observe(el);
        }
      }
    };

    fetchArticlesPage();
  }, [
    articlesPage,
    selectedNamesKey,
    selectedCategoryNames,
    onlyMine,
    isAuthenticated,
    isAuthLoading,
    authUserId,
    hasMoreArticles,
    filterSigBase,
    setArticles,
    addArticles,
    setHasMoreArticles,
    setLoading,
    setError,
  ]);

  // Reset to first page only when filters actually change
  useEffect(() => {
    if (!isFiltersInitializedRef.current) return;
    const sig = filterSigBase;
    if (prevFilterSigRef.current !== null && prevFilterSigRef.current !== sig) {
      setArticlesPage(1);
      // Reset last loaded markers so pagination restarts cleanly for new filters
      lastLoadedFilterSigRef.current = null;
      lastLoadedPageRef.current = 0;
    }
    prevFilterSigRef.current = sig;
  }, [filterSigBase, setArticlesPage]);

  // Keep a ref of latest page to avoid stale closure in observer
  useEffect(() => {
    articlesPageRef.current = articlesPage;
  }, [articlesPage]);

  // Sync filters to URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (selectedCategoryNames.length > 0)
      params.set('categories', selectedCategoryNames.map((name) => name.toLowerCase()).join(','));
    if (onlyMine) params.set('mine', '1');
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState(null, '', newUrl);
  }, [selectedCategoryNames, onlyMine]);

  // IntersectionObserver for lazy load
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    if (!initialPageLoadedRef.current) return; // do not trigger pagination until first page loaded

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (
          first.isIntersecting &&
          hasMoreArticles &&
          !isLoadingMore &&
          !isLoading &&
          !isFetchInFlightRef.current &&
          !isPaginatingRef.current
        ) {
          isPaginatingRef.current = true;
          const nextPage = (articlesPageRef.current || 1) + 1;
          articlesPageRef.current = nextPage;
          setArticlesPage(nextPage);
          // Pause observing until the load finishes to avoid rapid retriggers
          observer.unobserve(el);
        }
      },
      { root: null, rootMargin: '200px 0px', threshold: 0.1 }
    );

    observer.observe(el);
    observerRef.current = observer;
    return () => observer.disconnect();
  }, [hasMoreArticles, isLoadingMore, isLoading, setArticlesPage]);

  // Show back-to-top button after scrolling down
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 600);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const filteredArticles = Array.isArray(articles)
    ? articles.filter((a) => (a as any)?.published === true)
    : [];

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
    <div className="py-6">
      {/* Articles Section with Categories */}
      <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
        <MotionContainer className="rounded-2xl bg-white p-5 shadow-2xl sm:p-6 lg:p-6">
          {/* Categories Section */}
          <div className="mb-8">
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
                const namesToToggle = getDescendantNames(cat.name).map((name) =>
                  name.toLowerCase()
                );
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
          </div>
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
                    className={
                      onlyMine
                        ? 'bg-brand hover:bg-brand-600 font-semibold text-white'
                        : 'font-medium text-gray-700'
                    }
                  >
                    My Articles
                  </Button>
                )}
                {(onlyMine || selectedCategoryNames.length > 0) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOnlyMine(false);
                      setSelectedCategoryNames([]);
                    }}
                    className="font-medium text-gray-700"
                  >
                    Clear all
                  </Button>
                )}
              </div>
            </div>
            {selectedCategoryNames.length > 0 && (
              <div className="mt-2 flex items-center gap-2 sm:gap-3">
                <span className="text-xs font-medium text-gray-700 sm:text-sm">Filtered by:</span>
                <div className="flex flex-wrap gap-2">
                  {selectedCategoryNames.map((name) => {
                    const cat = getCategoryByName(name);
                    if (!cat) return null;
                    return (
                      <div
                        key={name}
                        className="flex items-center rounded-full px-3 py-1.5 text-xs font-semibold shadow-md shadow-gray-200/50 sm:px-4 sm:py-2 sm:text-sm"
                        style={{
                          backgroundColor: `${cat.color || '#3B82F6'}15`,
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
                          className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-current hover:bg-current/10"
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

          {(() => {
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
                {filteredArticles.map((article) => (
                  <motion.div
                    key={article.id}
                    variants={itemVariants}
                    whileHover={{
                      y: -12,
                      scale: 1.02,
                      transition: { type: 'spring', stiffness: 380, damping: 28 },
                    }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Link href={`/articles/${article.slug}`} className="block h-full">
                      <div className="group hover:shadow-3xl shadow-brand/30 hover:shadow-brand/40 block flex h-full transform cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-2xl drop-shadow-2xl transition-all duration-500 ease-out hover:-translate-y-4 hover:scale-[1.02]">
                        {/* Thumbnail (consistent height whether exists or not) */}
                        <div className="relative aspect-[16/9] w-full overflow-hidden">
                          {article.thumbnail ? (
                            <img
                              src={article.thumbnail}
                              alt={article.title}
                              className="h-full w-full object-cover transition-all duration-500 ease-out group-hover:scale-110 group-hover:brightness-110"
                            />
                          ) : (
                            <div
                              className="h-full w-full transition-all duration-500 ease-out group-hover:scale-110"
                              style={{
                                background: `linear-gradient(135deg, ${article.category.color}12, #ffffff)`,
                              }}
                            />
                          )}
                          {/* Overlay effect */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100" />
                        </div>

                        {/* Article Header */}
                        <div className="flex flex-1 flex-col p-4 pb-3 sm:p-6 sm:pb-4">
                          <div className="mb-3 flex items-center justify-between sm:mb-4">
                            <button
                              className="inline-flex items-center rounded-full px-2.5 py-1.5 text-[10px] font-semibold transition-all duration-300 ease-out hover:scale-110 hover:shadow-lg sm:px-3 sm:text-xs"
                              style={{
                                backgroundColor: `${article.category.color}15`,
                                color: article.category.color,
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
                            <div className="flex items-center text-xs text-gray-600">
                              <Calendar className="mr-1 h-3 w-3" />
                              {new Date(article.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                          </div>

                          <h3 className="group-hover:text-brand mb-2 line-clamp-2 flex-1 text-lg font-bold text-gray-900 transition-all duration-300 ease-out group-hover:scale-[1.02] sm:mb-3 sm:text-xl">
                            {article.title}
                          </h3>

                          <div className="flex items-center text-xs text-gray-700 transition-all duration-300 ease-out group-hover:translate-x-1 sm:text-sm">
                            <div className="mr-2 sm:mr-3">
                              <Avatar className="h-6 w-6 transition-all duration-300 ease-out group-hover:scale-110 group-hover:shadow-lg">
                                <AvatarImage
                                  src={article.author.avatar || undefined}
                                  alt={article.author.name}
                                />
                                <AvatarFallback className="text-[10px] font-bold">
                                  {article.author.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <span className="group-hover:text-brand font-medium transition-colors duration-300 ease-out">
                              {article.author.name}
                            </span>
                          </div>
                        </div>

                        {/* Article Footer */}
                        <div className="group-hover:from-brand/5 group-hover:to-brand-700/5 bg-gray-50/50 px-4 py-3 transition-all duration-300 ease-out group-hover:bg-gradient-to-r sm:px-6 sm:py-4">
                          <div className="grid grid-cols-3 text-xs text-gray-700 sm:text-sm">
                            {/* Views - Left */}
                            <div className="flex items-center justify-center gap-1.5 transition-all duration-300 ease-out group-hover:scale-105 sm:gap-2">
                              <Eye className="group-hover:text-brand h-4 w-4 text-gray-600 transition-all duration-300 ease-out group-hover:scale-110" />
                              <span
                                className="group-hover:text-brand font-medium tabular-nums transition-colors duration-300 ease-out"
                                aria-label="views count"
                              >
                                {typeof article.views === 'number' ? article.views : 0}
                              </span>
                            </div>
                            {/* Likes - Center */}
                            <div className="flex items-center justify-center gap-1.5 transition-all duration-300 ease-out group-hover:scale-105 sm:gap-2">
                              <ThumbsUp
                                className="group-hover:text-brand h-4 w-4 text-gray-600 transition-all duration-300 ease-out group-hover:scale-110"
                                aria-hidden="true"
                              />
                              <span
                                className="group-hover:text-brand font-medium tabular-nums transition-colors duration-300 ease-out"
                                aria-label="likes count"
                              >
                                {article._count.likes}
                              </span>
                            </div>
                            {/* Comments - Right */}
                            <div className="flex items-center justify-center gap-1.5 transition-all duration-300 ease-out group-hover:scale-105 sm:gap-2">
                              <MessageSquare
                                className="group-hover:text-brand h-4 w-4 text-gray-600 transition-all duration-300 ease-out group-hover:scale-110"
                                aria-hidden="true"
                              />
                              <span
                                className="group-hover:text-brand font-medium tabular-nums transition-colors duration-300 ease-out"
                                aria-label="comments count"
                              >
                                {article._count.comments}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            );
          })()}

          {filteredArticles.length === 0 && (
            <div className="px-4 py-12 text-center sm:py-16">
              <div className="from-brand/20 to-brand-700/20 mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br sm:mb-6 sm:h-20 sm:w-20">
                <BookOpen className="text-brand h-8 w-8 sm:h-10 sm:w-10" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-gray-900 sm:mb-3 sm:text-2xl">
                No articles found
              </h3>
              <p className="mx-auto mb-6 max-w-md text-base text-gray-700 sm:mb-8 sm:text-lg">
                {selectedCategoryNames.length > 0
                  ? "Try adjusting your filter criteria to find what you're looking for."
                  : 'Be the first to share your knowledge with the community!'}
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedCategoryNames([]);
                }}
                className="from-brand to-brand-700 hover:from-brand-600 hover:to-brand-700 bg-gradient-to-r font-semibold text-white"
              >
                {selectedCategoryNames.length > 0 ? 'Clear Filters' : 'Explore Topics'}
              </Button>
            </div>
          )}

          {/* Lazy load sentinel */}
          <MotionContainer delay={0.02}>
            <div ref={loadMoreRef} className="h-10 w-full" />
          </MotionContainer>
          {isLoadingMore && (
            <MotionContainer delay={0.04}>
              <div className="mt-2 rounded-lg bg-white/40 py-2 text-center text-sm text-gray-600 shadow-md shadow-gray-200/50 backdrop-blur-sm">
                Loading more...
              </div>
            </MotionContainer>
          )}
          {!isLoadingMore && !isLoading && !hasMoreArticles && filteredArticles.length > 0 && (
            <MotionContainer delay={0.04}>
              <div className="mt-3 rounded-lg bg-white/40 py-2 text-center text-sm text-gray-500 shadow-md shadow-gray-200/50 backdrop-blur-sm">
                No more articles to show
              </div>
            </MotionContainer>
          )}
        </MotionContainer>
      </div>
      {showBackToTop && (
        <button
          type="button"
          aria-label="Back to top"
          title="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="bg-brand ring-brand/30 hover:bg-brand-600 hover:ring-brand/40 supports-[backdrop-filter]:bg-brand/90 fixed bottom-6 left-4 z-[40] flex h-12 w-12 items-center justify-center rounded-full text-white shadow-xl ring-1 backdrop-blur transition-all duration-200 hover:scale-105 hover:shadow-2xl sm:bottom-6 sm:left-6"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
